document.addEventListener('DOMContentLoaded', () => {
    let currentMode = 'employee';
    let currentYear = '2024';

    const fields = [
        'inc-salary', 'inc-sales', 'inc-blue-deduction', 'inc-misc', 'inc-dividend',
        'exp-supplies', 'exp-travel', 'exp-comm', 'exp-rent', 'exp-other', 'exp-entert',
        'exp-stock-start', 'exp-purchase', 'exp-stock-end',
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

        const expIds = ['exp-supplies', 'exp-travel', 'exp-comm', 'exp-rent', 'exp-other', 'exp-entert'];
        const generalExpTotal = expIds.reduce((sum, id) => sum + (parseInt(document.getElementById(id).value) || 0), 0);

        const cogsTotal = (parseInt(document.getElementById('exp-stock-start').value) || 0) +
            (parseInt(document.getElementById('exp-purchase').value) || 0) -
            (parseInt(document.getElementById('exp-stock-end').value) || 0);

        const expTotal = generalExpTotal + Math.max(0, cogsTotal);
        document.getElementById('inc-expenses').value = expTotal;

        // Update summary labels on the scale
        const cogsEl = document.getElementById('val-summary-cogs');
        const othersEl = document.getElementById('val-summary-others');
        if (cogsEl) cogsEl.value = Math.max(0, cogsTotal);
        if (othersEl) othersEl.value = generalExpTotal;

        const activeFields = currentMode === 'employee'
            ? fields.filter(f => !['inc-sales', 'inc-expenses', 'inc-blue-deduction', ...expIds, 'exp-stock-start', 'exp-purchase', 'exp-stock-end'].includes(f))
            : fields.filter(f => f !== 'inc-salary');

        fields.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const val = el.value;
            data[id] = parseInt(val) || 0;
            // Progress logic
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

        const deductionList = [
            { label: '基礎控除', value: basicDeduction },
            { id: 'ded-social', label: '社会保険料' },
            { id: 'ded-life', label: '生命保険料' },
            { id: 'ded-ideco', label: 'iDeCo/小規模企業共済' },
            { id: 'ded-earthquake', label: '地震保険料' },
            { id: 'ded-furusato', label: '寄附金(ふるさと納税)' },
            { id: 'ded-medical', label: '医療費' },
            { id: 'ded-family', label: '配偶者・扶養' }
        ];

        const totalDeductions = deductionList.reduce((sum, d) => {
            const val = d.id ? data[d.id] : d.value;
            return sum + (val || 0);
        }, 0);

        const taxableBase = Math.max(0, displayIncome - totalDeductions);

        // Update Visuals
        updateVisuals(data, displayIncome, totalDeductions, taxableBase, deductionList);

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
        deductionList.forEach(d => {
            const val = d.id ? data[d.id] : d.value;
            if (val > 0) md += `- ${d.label}: ${val.toLocaleString()} 円\n`;
        });
        md += `**👉 控除の総額: ${totalDeductions.toLocaleString()} 円**\n\n`;

        md += `### 3. 税額控除・支払済み\n`;
        md += `- 源泉徴収税額: ${data['tax-paid'].toLocaleString()} 円\n`;
        if (data['tax-home-loan']) md += `- 住宅ローン控除: ${data['tax-home-loan'].toLocaleString()} 円\n`;
        md += `\n`;

        md += `---\n*このメモはブラウザの個人用データ(Local)に保存されています。*`;

        document.getElementById('preview').textContent = md;
    }

    function updateVisuals(data, totalIncome, totalDeductions, taxable, dedList) {
        // Stage 1: Scale (Only business sales vs expenses)
        const scaleBeam = document.getElementById('scale-beam');
        const bizIncomeEl = document.getElementById('viz-biz-income');
        const incStack = document.getElementById('income-stack');
        const expStack = document.getElementById('expense-stack');

        if (currentMode === 'business') {
            const sales = data['inc-sales'] || 0;
            const expenses = data['inc-expenses'] || 0;
            const bizProfit = Math.max(0, sales - expenses); // Result on scale is gross profit
            bizIncomeEl.textContent = bizProfit.toLocaleString();

            const maxRef = Math.max(1000000, sales, expenses);
            const ratio = Math.max(-1, Math.min(1, (sales - expenses) / maxRef));
            const angle = -ratio * 15;

            scaleBeam.style.transform = `rotate(${angle}deg)`;
            const pans = document.querySelectorAll('.scale-pan-viz');
            pans.forEach(p => p.style.transform = `rotate(${-angle}deg)`);

            const createBlocks = (container, amount, type) => {
                container.innerHTML = '';
                const blockCount = Math.min(10, Math.ceil(amount / (maxRef / 10 || 1)));
                for (let i = 0; i < blockCount; i++) {
                    const b = document.createElement('div');
                    b.className = `block ${type}`;
                    b.style.opacity = 1 - (i * 0.05);
                    container.appendChild(b);
                }
            };
            createBlocks(incStack, sales, 'income');
            createBlocks(expStack, expenses, 'expense');
        }

        // Stage 2: Flow (Deductions)
        document.getElementById('val-flow-income').textContent = totalIncome.toLocaleString();
        document.getElementById('val-flow-taxable').textContent = taxable.toLocaleString();

        // Update Basic Deduction display
        const basicDedEl = document.getElementById('label-basic-deduction');
        if (basicDedEl) {
            const basic = dedList.find(d => d.label === '基礎控除')?.value || 0;
            basicDedEl.textContent = basic.toLocaleString();
        }

        // Highlight active gates
        fields.forEach(id => {
            const input = document.getElementById(id);
            if (input && input.closest('.gate-item')) {
                const gate = input.closest('.gate-item');
                const val = parseInt(input.value) || 0;
                gate.style.opacity = val > 0 ? '1' : '0.4';
                gate.style.borderColor = val > 0 ? 'var(--secondary)' : 'var(--border)';
            }
        });
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

    // Monthly Sales Logic
    const modalSales = document.getElementById('modal-sales-monthly');
    const openSalesBtn = document.getElementById('btn-open-monthly');
    const closeSalesBtn = document.getElementById('btn-close-modal');
    const saveSalesBtn = document.getElementById('btn-save-monthly');
    const monthInputs = document.querySelectorAll('.input-month[data-month]');

    if (openSalesBtn) openSalesBtn.addEventListener('click', () => modalSales.classList.add('active'));
    if (closeSalesBtn) closeSalesBtn.addEventListener('click', () => modalSales.classList.remove('active'));
    if (saveSalesBtn) {
        saveSalesBtn.addEventListener('click', () => {
            let total = 0;
            monthInputs.forEach(input => total += parseInt(input.value) || 0);
            document.getElementById('inc-sales').value = total;
            update();
            saveData();
            modalSales.classList.remove('active');
        });
    }

    // Expenses Detail Logic
    const modalExp = document.getElementById('modal-expenses-detail');
    const openExpBtn = document.getElementById('btn-open-expenses');
    const closeExpBtn = document.getElementById('btn-close-exp-modal');
    const saveExpBtn = document.getElementById('btn-save-expenses');

    if (openExpBtn) openExpBtn.addEventListener('click', () => modalExp.classList.add('active'));
    if (closeExpBtn) closeExpBtn.addEventListener('click', () => modalExp.classList.remove('active'));
    if (saveExpBtn) {
        saveExpBtn.addEventListener('click', () => {
            update();
            saveData();
            modalExp.classList.remove('active');
        });
    }

    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target === modalSales) modalSales.classList.remove('active');
        if (e.target === modalExp) modalExp.classList.remove('active');
    });

    // Initial Load
    loadData();
});
