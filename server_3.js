const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const fs = require('fs');

const app = express();

// ✅ Allow only your frontend origin
app.use(cors({
    origin: 'https://meepansewa.co.in',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));

// ✅ Handle preflight requests for the API endpoint
app.options('/api/getRationData', cors());

app.use(express.json());

app.post('/api/getRationData', async (req, res) => {
    const inputValue = req.body.rationCardNo;
    const logs = [];

    const log = (message, type = 'info') => {
        const color = {
            info: 'black',
            success: 'green',
            error: 'red',
            warn: 'orange'
        }[type];
        const timestamp = new Date().toLocaleTimeString();
        logs.push(`<p style="color:${color}">[${timestamp}] ${message}</p>`);
        console.log(`[${timestamp}] ${message}`);
    };

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();

    try {
        let attempt = 0, loaded = false;
        while (attempt < 3 && !loaded) {
            attempt++;
            try {
                log(`🌐 Attempt ${attempt}: Navigating to EPDS Telangana...`);
                await page.goto('https://epds.telangana.gov.in/FoodSecurityAct/', { waitUntil: 'domcontentloaded', timeout: 60000 });
                log("✅ Page loaded successfully.", 'success');
                loaded = true;
            } catch (err) {
                log(`❌ Attempt ${attempt} failed: ${err.message}`, 'error');
                if (attempt < 3) {
                    log(`🔁 Retrying page load in 5 seconds...`, 'warn');
                    await new Promise(r => setTimeout(r, 5000));
                } else {
                    throw err;
                }
            }
        }

        try {
            await page.waitForSelector('span.top-right.close', { timeout: 5000 });
            await page.click('span.top-right.close');
            log("✅ Popup closed.", 'success');
        } catch (err) {
            log("🔴 Popup not found or close failed: " + err.message, 'warn');
        }

        log("🧭 STEP 3: Clicking on FSC Search button (#asid)...");
        try {
            await page.waitForSelector("#asid", { timeout: 10000 });
            await page.click("#asid");
            log("✅ STEP 3: FSC Search clicked successfully.", 'success');
        } catch (err) {
            log(`❌ STEP 3 FAILED (Clicking on #asid): ${err.message}`, 'error');
            throw err;
        }

        log("🧭 STEP 4: Hovering on 'Ration Cards Search'...");
        try {
            await page.waitForSelector("button.dropbtn", { timeout: 10000 });
            const buttons = await page.$$("button.dropbtn");
            log(`🔍 Found ${buttons.length} buttons with class 'dropbtn'.`);
            if (buttons.length > 0) {
                await buttons[0].hover();
                log("✅ Hovered on 'Ration Cards Search'.", 'success');
            } else {
                throw new Error("No 'dropbtn' buttons found to hover.");
            }
        } catch (err) {
            log(`❌ STEP 4 FAILED (Hover on Ration Cards Search): ${err.message}`, 'error');
            throw err;
        }

        try {
            await page.waitForSelector(".dropdown-content a", { visible: true, timeout: 10000 });
            const links = await page.$$(".dropdown-content a");
            log(`🔍 Found ${links.length} links in '.dropdown-content'.`);
            let clicked = false;
            for (const link of links) {
                const text = await page.evaluate(el => el.innerText.trim(), link);
                if (text.includes("FSC Search")) {
                    await Promise.all([
                        page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
                        link.click()
                    ]);
                    log("✅ Clicked on 'FSC Search' link.", 'success');
                    clicked = true;
                    break;
                }
            }
            if (!clicked) throw new Error("FSC Search link not found in dropdown.");
        } catch (err) {
            log(`❌ STEP 5 FAILED (Click on FSC Search): ${err.message}`, 'error');
            throw err;
        }

        try {
            const rationCardRadioButtonSelector = "input[type='radio'][id*='epdsRcNoRadio']";
            const rationCardInputSelector = "input[type='text'][id*='epdsRcNoText']";
            const searchButtonSelector = "input[type='button'][id*='searchButton']";

            log("⏳ Waiting for Ration Card radio button...");
            await page.waitForSelector(rationCardRadioButtonSelector, { timeout: 15000 });

            let radioButtonClicked = false;
            for (let i = 0; i < 2; i++) {
                await page.click(rationCardRadioButtonSelector);
                log(`🖱️ Clicked Ration Card radio button (Attempt ${i + 1}).`);
                try {
                    await page.waitForSelector(rationCardInputSelector, { visible: true, timeout: 5000 });
                    log("✅ Ration Card input field appeared.", 'success');
                    radioButtonClicked = true;
                    break;
                } catch (inputErr) {
                    log(`⚠️ Ration Card input field did not appear after click ${i + 1}.`, 'warn');
                    if (i < 1) {
                        log("🔄 Trying to click the radio button again...", 'warn');
                    }
                }
            }

            if (!radioButtonClicked) {
                throw new Error("Ration Card input field did not appear after multiple radio button clicks.");
            }

            await page.type(rationCardInputSelector, inputValue);
            log("📝 Typed Ration Card number: " + inputValue);

            await page.waitForSelector(searchButtonSelector, { timeout: 10000 });
            log("⏳ Clicking Search button and waiting for AJAX response...");
            await page.click(searchButtonSelector);

            try {
                await page.waitForSelector("#searchButton1b--ajax-indicator", { timeout: 5000 });
                await page.waitForSelector("#searchButton1b--ajax-indicator", { hidden: true, timeout: 25000 });
                log("✅ AJAX response received.", 'success');
            } catch {
                log("⚠️ AJAX indicator did not behave as expected. Continuing anyway.", 'warn');
            }

            log("⏳ Waiting for result element to appear...");
            await page.waitForFunction(() => {
                const resultTables = Array.from(document.querySelectorAll("table"));
                return resultTables.some(tbl => tbl.innerText.includes("Ration Card") || tbl.innerText.includes("Name") || tbl.innerText.includes("Mobile"));
            }, { timeout: 30000 });
            log("✅ Result content appeared in table.", 'success');
        } catch (err) {
            const content = await page.content();
            fs.writeFileSync("debug-page.html", content);
            log("📄 Saved full HTML to debug-page.html for inspection.", 'warn');
            log(`❌ STEP 6 FAILED (Form filling/search): ${err.message}`, 'error');
            throw err;
        }

        let result = {}, tableHTML = '', members = [];
        try {
            log("⏳ Extracting data...");
            await page.waitForFunction(() => {
                return Array.from(document.querySelectorAll("td")).some(td => td.innerText.trim().match(/^\d{12}$/));
            }, { timeout: 40000 });

            tableHTML = await page.evaluate(() => {
                const tables = Array.from(document.querySelectorAll("table"));
                const matchTable = tables.find(table => table.innerText.includes("Ration Card") || table.innerText.includes("Name"));
                return matchTable ? matchTable.outerHTML : "<p>No table found</p>";
            });

            result = await page.evaluate(() => {
                const extractValue = (labelText) => {
                    const tds = Array.from(document.querySelectorAll('td'));
                    for (let i = 0; i < tds.length; i++) {
                        const tdText = tds[i].innerText.trim().replace(/\s+/g, '').toLowerCase();
                        const cleanLabel = labelText.replace(/\s+/g, '').toLowerCase();
                        if (tdText === cleanLabel && i + 1 < tds.length) {
                            return tds[i + 1].innerText.trim();
                        }
                    }
                    return '❌ Not found';
                };

                return {
                    newRationCardNo: extractValue("New Ration Card No :"),
                    fscRefNo: extractValue("FSC Reference No . :"),
                    cardType: extractValue("Card Type :"),
                    applicationStatus: extractValue("Application Status :"),
                    applicationNo: extractValue("Application No :"),
                    SKSFormNo: extractValue("SKS Form No :"),
                    OfficeName: extractValue("Office Name :"),
                    FPShopNo: extractValue("FPShop No :"),
                    headOfFamily: extractValue("Head of the Family :"),
                    district: extractValue("District :"),
                    IMPDSStatus: extractValue("IMPDS Status :"),
                    gasConnection: extractValue("Gas Connection :"),
                    ConsumerNo: extractValue("Consumer No :"),
                    KeyRegisterSlNo: extractValue("KeyRegister Sl.No :"),
                    OldRCNo: extractValue("Old RCNo :")
                };
            });

            members = await page.evaluate(() => {
                const table = document.querySelector('#dashboarddata2b');
                if (!table) return [];

                const rows = table.querySelectorAll('tr');
                const memberList = [];

                for (let i = 2; i < rows.length; i++) {
                    const cols = rows[i].querySelectorAll('td');
                    if (cols.length >= 2) {
                        const sno = cols[0].innerText.trim();
                        const name = cols[1].innerText.trim();
                        memberList.push({ sno, name });
                    }
                }

                return memberList;
            });

            log("📋 Data extracted:");
            for (const [key, val] of Object.entries(result)) {
                log(`${key}: ${val}`);
            }

            log(`👨‍👩‍👧‍👦 Found ${members.length} member(s): ${members.map(m => m.name).join(', ')}`);

        } catch (err) {
            log("❌ STEP 7 FAILED: " + err.message, 'error');
            throw err;
        }

        await browser.close();
        res.json({ result, tableHTML, members, log: logs.join('\n') });

    } catch (err) {
        await browser.close();
        res.status(500).json({ error: err.message, log: logs.join('\n') });
    }
});

app.use(express.static('public'));
app.listen(3000, () => console.log("🚀 Server running on http://localhost:3000"));
