// User Management
const defaultUsers = [
    { name: "ICT", password: "paradise" },
    { name: "TR1", password: "paradise" },
    { name: "TR2", password: "paradise" },
    { name: "TR3", password: "paradise" },
    { name: "TR4", password: "paradise" },
    { name: "TR5", password: "paradise" },
    { name: "TR6", password: "paradise" }
];

function initializeUsers() {
    if (!localStorage.getItem('users')) {
        localStorage.setItem('users', JSON.stringify(defaultUsers));
    }
}

function login(name, password) {
    initializeUsers();
    const users = JSON.parse(localStorage.getItem('users'));
    const user = users.find(u => u.name === name && u.password === password);
    if (user) {
        localStorage.setItem('currentUser', name);
        return true;
    }
    return false;
}

function isLoggedIn() {
    return !!localStorage.getItem('currentUser');
}

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

function changeUserDetails() {
    const newName = document.getElementById('newName').value;
    const newPassword = document.getElementById('newPassword').value;
    const currentUser = localStorage.getItem('currentUser');
    const users = JSON.parse(localStorage.getItem('users'));
    const userIndex = users.findIndex(u => u.name === currentUser);
    if (newName) users[userIndex].name = newName;
    if (newPassword) users[userIndex].password = newPassword;
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('currentUser', newName || currentUser);
    alert('Details updated');
}

function resetPassword() {
    const currentUser = localStorage.getItem('currentUser');
    const users = JSON.parse(localStorage.getItem('users'));
    const userIndex = users.findIndex(u => u.name === currentUser);
    users[userIndex].password = "paradise";
    localStorage.setItem('users', JSON.stringify(users));
    alert('Password reset to "paradise"');
}

// Learner Management
function addLearner(learner) {
    let learners = JSON.parse(localStorage.getItem('learners')) || {};
    const gradeList = learners[`grade${learner.grade}`] || [];
    if (gradeList.some(l => l.adm === learner.adm)) return false;
    gradeList.push(learner);
    learners[`grade${learner.grade}`] = gradeList;
    localStorage.setItem('learners', JSON.stringify(learners));
    return true;
}

// Marks Upload and Report Card Generation
const subjects16 = ['English', 'Kiswahili', 'Mathematics', 'Science and Tech', 'C.R.E', 'C.A & Sports', 'Social Studies', 'Agriculture'];
const subjects79 = ['English', 'Kiswahili', 'Mathematics', 'Integrated Science', 'C.R.E', 'C.A & Sports', 'Pre-Technical Studies', 'Social Studies', 'Agriculture'];

function getRubric(marks) {
    if (marks < 10) return 0.5;
    if (marks <= 20) return 1.0;
    if (marks <= 30) return 1.5;
    if (marks <= 40) return 2.0;
    if (marks <= 57) return 2.5;
    if (marks <= 74) return 3.0;
    if (marks <= 89) return 3.5;
    return 4.0;
}

function getComment(marks) {
    if (marks < 10) return "BE 2";
    if (marks <= 20) return "BE1";
    if (marks <= 30) return "AE2";
    if (marks <= 40) return "AE1";
    if (marks <= 57) return "ME2";
    if (marks <= 74) return "ME1";
    if (marks <= 89) return "EE2";
    return "EE1";
}

function uploadMarks(grade) {
    const exam1File = document.getElementById(`exam1_${grade}`).files[0];
    const exam2File = document.getElementById(`exam2_${grade}`).files[0];
    if (!exam1File || !exam2File) {
        alert('Please upload both exam files');
        return;
    }

    const readFile = (file, type) => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const students = [];
            let row = 5;
            while (sheet[`B${row}`]) {
                const student = {
                    adm: sheet[`B${row}`].v,
                    name: sheet[`C${row}`].v,
                    marks: {}
                };
                for (let col = 'D'; col <= 'L'; col = String.fromCharCode(col.charCodeAt(0) + 1)) {
                    student.marks[col] = sheet[`${col}${row}`]?.v || 0;
                }
                students.push(student);
                row++;
            }
            resolve({ schoolName: sheet['A1']?.v || 'Unknown School', students });
        };
        reader.readAsBinaryString(file);
    });

    Promise.all([readFile(exam1File, 'exam1'), readFile(exam2File, 'exam2')]).then(([exam1Data, exam2Data]) => {
        localStorage.setItem(`exam1_grade${grade}`, JSON.stringify(exam1Data.students));
        localStorage.setItem(`exam2_grade${grade}`, JSON.stringify(exam2Data.students));
        localStorage.setItem(`schoolName_grade${grade}`, exam1Data.schoolName);
        document.getElementById(`generate_${grade}`).style.display = 'inline';
        alert('Marks uploaded successfully');
    });
}

function generateReportCards(grade) {
    const exam1Data = JSON.parse(localStorage.getItem(`exam1_grade${grade}`));
    const exam2Data = JSON.parse(localStorage.getItem(`exam2_grade${grade}`));
    const schoolName = localStorage.getItem(`schoolName_grade${grade}`) || 'Unknown School';
    if (!exam1Data || !exam2Data) {
        alert('Please upload both exam files first');
        return;
    }

    const subjects = grade <= 6 ? subjects16 : subjects79;
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([[schoolName]]);
    let row = 3;

    exam1Data.forEach((student, index) => {
        const exam2Student = exam2Data.find(s => s.adm === student.adm);
        const learnerDetails = [`Learner's Name: ${student.name}, Adm: ${student.adm}, Grade: ${grade}, Term: Three, Year: 2024`];
        XLSX.utils.sheet_add_aoa(ws, [learnerDetails], { origin: `A${row}` });
        row++;
        XLSX.utils.sheet_add_aoa(ws, [['S/NO', 'LEARNING AREA', 'EXAM 1', 'RUBRIC', 'EXAM 2', 'RUBRIC', 'COMMENT']], { origin: `A${row}` });
        row++;

        let exam1Sum = 0, exam2Sum = 0, count = 0;
        subjects.forEach((subject, sIndex) => {
            const col = String.fromCharCode(68 + sIndex); // D to L
            const exam1Marks = Number(student.marks[col]) || 0;
            const exam2Marks = Number(exam2Student.marks[col]) || 0;
            const rubric1 = getRubric(exam1Marks);
            const rubric2 = getRubric(exam2Marks);
            const comment = getComment(exam2Marks);
            XLSX.utils.sheet_add_aoa(ws, [[sIndex + 1, subject, exam1Marks, rubric1, exam2Marks, rubric2, comment]], { origin: `A${row}` });
            exam1Sum += exam1Marks;
            exam2Sum += exam2Marks;
            count++;
            row++;
        });

        const avg1 = (exam1Sum / count).toFixed(2);
        const avg2 = (exam2Sum / count).toFixed(2);
        XLSX.utils.sheet_add_aoa(ws, [['AVERAGE', '', avg1, getRubric(avg1), avg2, getRubric(avg2), '']], { origin: `A${row}` });
        row += 2; // Space before next student
    });

    XLSX.utils.book_append_sheet(wb, ws, `Grade ${grade} Report Cards`);
    XLSX.writeFile(wb, `report_cards_grade${grade}.xlsx`);
}

// Records Management
function viewLearners() {
    const learners = JSON.parse(localStorage.getItem('learners')) || {};
    let html = '<h2>Learners by Grade</h2>';
    for (let g = 1; g <= 9; g++) {
        const gradeList = learners[`grade${g}`] || [];
        if (gradeList.length) {
            html += `<h3>Grade ${g}</h3><ul>`;
            gradeList.forEach(l => {
                html += `<li onclick="showLearnerMarks('${g}', '${l.adm}')">${l.name} (Adm: ${l.adm})</li>`;
            });
            html += '</ul>';
        }
    }
    document.getElementById('recordsContent').innerHTML = html;
}

function showLearnerMarks(grade, adm) {
    const exam1Data = JSON.parse(localStorage.getItem(`exam1_grade${grade}`)) || [];
    const exam2Data = JSON.parse(localStorage.getItem(`exam2_grade${grade}`)) || [];
    const student1 = exam1Data.find(s => s.adm === adm);
    const student2 = exam2Data.find(s => s.adm === adm);
    if (!student1 || !student2) {
        alert('No marks available');
        return;
    }
    const subjects = grade <= 6 ? subjects16 : subjects79;
    let html = `<h3>Marks for ${student1.name} (Adm: ${adm})</h3><table><tr><th>Subject</th><th>Exam 1</th><th>Exam 2</th></tr>`;
    subjects.forEach((s, i) => {
        const col = String.fromCharCode(68 + i);
        html += `<tr><td>${s}</td><td>${student1.marks[col]}</td><td>${student2.marks[col]}</td></tr>`;
    });
    html += '</table>';
    document.getElementById('recordsContent').innerHTML = html;
}

function viewUploads() {
    let html = '<h2>Uploaded Marks</h2>';
    for (let g = 1; g <= 9; g++) {
        const exam1Data = JSON.parse(localStorage.getItem(`exam1_grade${g}`)) || [];
        const exam2Data = JSON.parse(localStorage.getItem(`exam2_grade${g}`)) || [];
        if (exam1Data.length || exam2Data.length) {
            html += `<h3>Grade ${g}</h3><table><tr><th>Name</th><th>Adm</th><th>Exam 1</th><th>Exam 2</th><th>Actions</th></tr>`;
            exam1Data.forEach(s => {
                const s2 = exam2Data.find(x => x.adm === s.adm) || {};
                html += `<tr><td>${s.name}</td><td>${s.adm}</td><td>${Object.values(s.marks).join(', ')}</td><td>${Object.values(s2.marks || {}).join(', ')}</td><td><button onclick="editMarks('${g}', '${s.adm}')">Edit</button><button onclick="deleteMarks('${g}', '${s.adm}')">Delete</button></td></tr>`;
            });
            html += '</table><button onclick="saveUploads(${g})">Save</button>';
        }
    }
    document.getElementById('recordsContent').innerHTML = html;
}

function editMarks(grade, adm) {
    // Simplified edit: reload page to re-upload for now
    alert('Edit functionality: Re-upload marks via Upload Marks page');
}

function deleteMarks(grade, adm) {
    let exam1Data = JSON.parse(localStorage.getItem(`exam1_grade${grade}`)) || [];
    let exam2Data = JSON.parse(localStorage.getItem(`exam2_grade${grade}`)) || [];
    exam1Data = exam1Data.filter(s => s.adm !== adm);
    exam2Data = exam2Data.filter(s => s.adm !== adm);
    localStorage.setItem(`exam1_grade${grade}`, JSON.stringify(exam1Data));
    localStorage.setItem(`exam2_grade${grade}`, JSON.stringify(exam2Data));
    viewUploads();
}

function saveUploads(grade) {
    alert('Marks saved (already stored in localStorage)');
}

function viewCards() {
    let html = '<h2>Report Cards</h2>';
    for (let g = 1; g <= 9; g++) {
        if (localStorage.getItem(`exam1_grade${g}`)) {
            html += `<h3>Grade ${g}</h3><button onclick="generateReportCards(${g})">Generate & Download</button>`;
        }
    }
    document.getElementById('recordsContent').innerHTML = html;
}
