document.addEventListener('DOMContentLoaded', () => {
    let currentMode = 'employee';
    let currentYear = '2024';

    const fields = [
        'inc-salary', 'inc-sales', 'inc-blue-deduction', 'inc-misc', 'inc-dividend',
        'exp-supplies', 'exp-travel', 'exp-comm', 'exp-rent', 'exp-other',
        'ded-social', 'ded-life', 'ded-ideco', 'ded-earthquake', 'ded-furusato', 'ded-medical', 'ded-family',
        'tax-paid', 'tax-home-loan'
    ];

    const modeBtns = {
        employee: document.getElementById('btn-employee'),
        business: document.getElementById('btn-business')
    };

    const yearBtns = {
        '2024': document.getElementById('btn-2024'),
        '2025': document.getElementById('btn-2025')
    };

    // Load Data
    function loadData() {
        const saved = localStorage.getItem('shinkokunData');
        const settings = localStorage.getItem('shinkokunSettings');

        if (settings) {
            const s = JSON.parse(settings);
            setMode(s.mode || 'employee', false);
            setYear(s.year || '2024', false);
        }

        if (saved) {
            const data = JSON.parse(saved);
            fields.forEach(id => {
                const el = document.getElementById(id);
                if (el && data[id] !== undefined) {
                    el.value = data[id];
                }
            });
        }
        update();
    }

    // Save Data
    function saveData() {
        const data = {};
        fields.forEach(id => {
            data[id] = document.getElementById(id).value;
        });
        localStorage.setItem('shinkokunData', JSON.stringify(data));
        localStorage.setItem('shinkokunSettings', JSON.stringify({ mode: currentMode, year: currentYear }));

        const status = document.getElementById('save-status');
        status.textContent = '自動保存済み (Local)';
        status.style.opacity = '1';
    }

    function setMode(mode, shouldSave = true) {
        currentMode = mode;
        document.body.className = `mode-${mode}`;
        modeBtns.employee.classList.toggle('active', mode === 'employee');
        modeBtns.business.classList.toggle('active', mode === 'business');
        if (shouldSave) {
            update();
            saveData();
        }
    }

    function setYear(year, shouldSave = true) {
        currentYear = year;
        yearBtns['2024'].classList.toggle('active', year === '2024');
        yearBtns['2025'].classList.toggle('active', year === '2025');
        if (shouldSave) {
            update();
            saveData();
        }
    }

    modeBtns.employee.addEventListener('click', () => setMode('employee'));
    modeBtns.business.addEventListener('click', () => setMode('business'));
    yearBtns['2024'].addEventListener('click', () => setYear('2024'));
    yearBtns['2025'].addEventListener('click', () => setYear('2025'));

    function update() {
        let filledCount = 0;
        let data = {};

        // Auto-sum expenses
        const expIds = ['exp-supplies', 'exp-travel', 'exp-comm', 'exp-rent', 'exp-other'];
        const expTotal = expIds.reduce((sum, id) => sum + (parseInt(document.getElementById(id).value) || 0), 0);
        document.getElementById('inc-expenses').value = expTotal;

        const activeFields = currentMode === 'employee'
            ? fields.filter(f => !['inc-sales', 'inc-expenses', 'inc-blue-deduction', ...expIds].includes(f))
            : fields.filter(f => f !== 'inc-salary');

        fields.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const val = el.value;
            data[id] = parseInt(val) || 0;
            // Progress logic (exclude Blue Deduction default)
            if (activeFields.includes(id) && val && val !== "0" && id !== 'inc-blue-deduction') filledCount++;
        });

        const progress = Math.min(100, (filledCount / (activeFields.length - 1)) * 100);
        document.getElementById('progress').style.width = `${progress}%`;

        // Income Logic
        let displayIncome = 0;
        let incomeLines = [];
        let expenseBreakdownLines = [];

        if (currentMode === 'employee') {
            displayIncome += data['inc-salary'];
            incomeLines.push(`- 給与の収入金額: ${data['inc-salary'].toLocaleString()} 円`);
        } else {
            const biz = Math.max(0, data['inc-sales'] - data['inc-expenses'] - data['inc-blue-deduction']);
            displayIncome += biz;
            incomeLines.push(`- 事業所得: ${biz.toLocaleString()} 円 (売上 ${data['inc-sales'].toLocaleString()} - 経費 ${data['inc-expenses'].toLocaleString()} - 青色控除 ${data['inc-blue-deduction'].toLocaleString()})`);

            if (data['exp-supplies']) expenseBreakdownLines.push(`  - 消耗品費: ${data['exp-supplies'].toLocaleString()} 円`);
            if (data['exp-travel']) expenseBreakdownLines.push(`  - 旅費交通費: ${data['exp-travel'].toLocaleString()} 円`);
            if (data['exp-comm']) expenseBreakdownLines.push(`  - 通信費: ${data['exp-comm'].toLocaleString()} 円`);
            if (data['exp-rent']) expenseBreakdownLines.push(`  - 地代家賃等: ${data['exp-rent'].toLocaleString()} 円`);
            if (data['exp-other']) expenseBreakdownLines.push(`  - 接待交際・他: ${data['exp-other'].toLocaleString()} 円`);
        }
        displayIncome += data['inc-misc'] + data['inc-dividend'];
        if (data['inc-misc']) incomeLines.push(`- 雑所得(副業等): ${data['inc-misc'].toLocaleString()} 円`);
        if (data['inc-dividend']) incomeLines.push(`- 配当所得: ${data['inc-dividend'].toLocaleString()} 円`);

        // Basic Deduction
        let basicDeduction = 480000;
        if (currentYear === '2025' && displayIncome <= 1320000) {
            basicDeduction = 950000;
        }

        const totalDeductions = basicDeduction + data['ded-social'] + data['ded-life'] + data['ded-ideco'] + data['ded-earthquake'] + data['ded-furusato'] + data['ded-medical'] + data['ded-family'];
        const taxableBase = Math.max(0, displayIncome - totalDeductions);

        // Markdown Output
        let md = `## 【e-Tax 清書用メモ】 ${currentYear}年分 (${currentMode === 'employee' ? '会社員' : '個人事業主'}) \n`;
        md += `作成: ${new Date().toLocaleDateString('ja-JP')} | しんこくん\n\n`;

        md += `### 1. 収入・決算の入力\n`;
        if (currentMode === 'business') {
            md += `#### 事業所得の内訳 (決算書用)\n`;
            md += `- 売上金額合計: ${data['inc-sales'].toLocaleString()} 円\n`;
            md += `- **経費合計: ${data['inc-expenses'].toLocaleString()} 円**\n`;
            expenseBreakdownLines.forEach(l => md += l + '\n');
            md += `- 青色申告特別控除: ${data['inc-blue-deduction'].toLocaleString()} 円\n\n`;
        }
        md += `#### 申告書への入力\n`;
        incomeLines.forEach(l => md += l + '\n');
        md += `\n`;

        md += `### 2. 所得控除の入力\n`;
        md += `- 基礎控除: ${basicDeduction.toLocaleString()} 円\n`;
        if (data['ded-social'] > 0) md += `- 社会保険料控除: ${data['ded-social'].toLocaleString()} 円\n`;
        if (data['ded-life'] > 0) md += `- 生命保険料控除: ${data['ded-life'].toLocaleString()} 円\n`;
        if (data['ded-ideco'] > 0) md += `- 小規模企業共済: ${data['ded-ideco'].toLocaleString()} 円\n`;
        if (data['ded-earthquake'] > 0) md += `- 地震保険料控除: ${data['ded-earthquake'].toLocaleString()} 円\n`;
        if (data['ded-furusato'] > 0) md += `- 寄附金控除(ふるさと納税): ${data['ded-furusato'].toLocaleString()} 円\n`;
        if (data['ded-medical'] > 0) md += `- 医療費控除: ${data['ded-medical'].toLocaleString()} 円\n`;
        if (data['ded-family'] > 0) md += `- 配偶者・扶養控除: ${data['ded-family'].toLocaleString()} 円\n`;
        md += `**👉 控除の総額: ${totalDeductions.toLocaleString()} 円**\n\n`;

        md += `### 3. 税額控除・支払済み\n`;
        md += `- 源泉徴収税額: ${data['tax-paid'].toLocaleString()} 円\n`;
        if (data['tax-home-loan']) md += `- 住宅ローン控除: ${data['tax-home-loan'].toLocaleString()} 円\n`;
        md += `\n`;

        md += `---\n*このメモはブラウザの個人用データ(Local)に保存されています。*`;

        document.getElementById('preview').textContent = md;
    }

    // Event Listeners for inputs
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                update();
                saveData();
            });
        }
    });

    // Copy Content
    document.getElementById('copy-btn').addEventListener('click', () => {
        const result = document.getElementById('preview').textContent;
        navigator.clipboard.writeText(result).then(() => {
            const btn = document.getElementById('copy-btn');
            const original = btn.textContent;
            btn.textContent = '✅ コピー完了';
            setTimeout(() => btn.textContent = original, 2000);
        });
    });

    // Clear Data
    document.getElementById('clear-btn').addEventListener('click', () => {
        if (confirm('全ての入力データを消去しますか？\n（この操作は取り消せません）')) {
            localStorage.removeItem('shinkokunData');
            localStorage.removeItem('shinkokunSettings');
            location.reload();
        }
    });

    // Initial Load
    loadData();
});
