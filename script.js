const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("dropZone");
const fileInfo = document.getElementById("fileInfo");
const fileName = document.getElementById("fileName");

const summarySection = document.getElementById("summarySection");
const cleaningSection = document.getElementById("cleaningSection");
const previewSection = document.getElementById("previewSection");

const rowCount = document.getElementById("rowCount");
const columnCount = document.getElementById("columnCount");
const duplicateCount = document.getElementById("duplicateCount");
const missingCount = document.getElementById("missingCount");

const removeDuplicatesBtn = document.getElementById("removeDuplicatesBtn");
const removeBlankRowsBtn = document.getElementById("removeBlankRowsBtn");
const trimSpacesBtn = document.getElementById("trimSpacesBtn");
const resetDataBtn = document.getElementById("resetDataBtn");
const downloadBtn = document.getElementById("downloadBtn");

const tableHead = document.getElementById("tableHead");
const tableBody = document.getElementById("tableBody");
const statusMessage = document.getElementById("statusMessage");

const searchInput = document.getElementById("searchInput");
const previousPageBtn = document.getElementById("previousPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const pageInfo = document.getElementById("pageInfo");

const statisticsSection = document.getElementById("statisticsSection");
const columnSelect = document.getElementById("columnSelect");

const statValues = document.getElementById("statValues");
const statMissing = document.getElementById("statMissing");
const statUnique = document.getElementById("statUnique");
const statExtra = document.getElementById("statExtra");
const statExtraLabel = document.getElementById("statExtraLabel");

const numericStats = document.getElementById("numericStats");
const statMin = document.getElementById("statMin");
const statMax = document.getElementById("statMax");
const statAverage = document.getElementById("statAverage");
const statMedian = document.getElementById("statMedian");

const missingColumnSelect = document.getElementById("missingColumnSelect");
const missingValueInput = document.getElementById("missingValueInput");
const fillMissingBtn = document.getElementById("fillMissingBtn");
const removeMissingRowsBtn = document.getElementById("removeMissingRowsBtn");

let originalData = null;
let currentData = null;
let loadedFileName = "dataset.csv";

let searchTerm = "";

let currentPage = 1;

const rowsPerPage = 10;

let sortColumnIndex = null;

let sortDirection = "asc";


// --------------------------------------------------
// FILE SELECTION
// --------------------------------------------------

fileInput.addEventListener("change", (event) => {
    const file = event.target.files[0];

    if (file) {
        processFile(file);
    }
});


// --------------------------------------------------
// DRAG AND DROP
// --------------------------------------------------

dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();

    dropZone.style.borderColor = "#2563eb";
    dropZone.style.background = "#eff6ff";
});

dropZone.addEventListener("dragleave", () => {
    resetDropZoneStyle();
});

dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    resetDropZoneStyle();

    const file = event.dataTransfer.files[0];

    if (file) {
        processFile(file);
    }
});

function resetDropZoneStyle() {
    dropZone.style.borderColor = "";
    dropZone.style.background = "";
}


// --------------------------------------------------
// READ FILE
// --------------------------------------------------

function processFile(file) {

    if (!file.name.toLowerCase().endsWith(".csv")) {
        showStatus("Please upload a CSV file.", "error");
        return;
    }

    const reader = new FileReader();

    reader.onload = function (event) {

        try {
            const csvText = event.target.result;

            loadCSV(csvText, file.name);

        } catch (error) {

            console.error(error);

            showStatus(
                "The CSV file could not be processed.",
                "error"
            );
        }
    };

    reader.onerror = function () {
        showStatus(
            "There was a problem reading the file.",
            "error"
        );
    };

    reader.readAsText(file);
}


// --------------------------------------------------
// LOAD CSV
// --------------------------------------------------

function loadCSV(csvText, name) {

    const parsedRows = parseCSV(csvText);

    if (parsedRows.length < 1) {
        showStatus("The CSV file appears to be empty.", "error");
        return;
    }

    /*
        Remove empty rows automatically created by
        trailing line breaks at the end of a CSV file.
    */

    while (
        parsedRows.length > 1 &&
        parsedRows[parsedRows.length - 1].every(
            cell => cell.trim() === ""
        )
    ) {
        parsedRows.pop();
    }


    let headers = parsedRows[0].map(
        header => header.trim()
    );

    let rows = parsedRows.slice(1);

    /*
        Determine the largest number of columns.
        Some CSV files can contain rows with more
        columns than the header row.
    */

    let maxColumns = headers.length;

    rows.forEach(row => {
        if (row.length > maxColumns) {
            maxColumns = row.length;
        }
    });


    /*
        Create missing column names if necessary.
    */

    while (headers.length < maxColumns) {
        headers.push(`Column ${headers.length + 1}`);
    }


    /*
        Replace empty header names.
    */

    headers = headers.map((header, index) => {
        return header || `Column ${index + 1}`;
    });


    /*
        Normalize every row to the same number
        of columns.
    */

    rows = rows.map(row => {

        const normalizedRow = [...row];

        while (normalizedRow.length < maxColumns) {
            normalizedRow.push("");
        }

        return normalizedRow.slice(0, maxColumns);
    });


    originalData = {
        headers: [...headers],

        rows: rows.map(row => [...row])
    };


    currentData = cloneDataset(originalData);

    loadedFileName = name;


    fileName.textContent = name;

    fileInfo.classList.remove("hidden");
    summarySection.classList.remove("hidden");
    cleaningSection.classList.remove("hidden");
    previewSection.classList.remove("hidden");
    statisticsSection.classList.remove("hidden");


    updateApplication();

    showStatus(
        `Successfully loaded ${rows.length.toLocaleString()} rows.`,
        "success"
    );
}


// --------------------------------------------------
// CSV PARSER
// --------------------------------------------------

function parseCSV(text) {

    /*
        This parser supports:

        normal commas
        quoted values
        commas inside quoted values
        escaped quotation marks
        line breaks inside quoted values
    */

    const rows = [];

    let row = [];
    let cell = "";

    let insideQuotes = false;


    /*
        Remove UTF-8 BOM if present.
    */

    if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
    }


    for (let i = 0; i < text.length; i++) {

        const character = text[i];
        const nextCharacter = text[i + 1];


        if (character === '"') {

            if (
                insideQuotes &&
                nextCharacter === '"'
            ) {

                /*
                    "" inside a quoted value
                    represents one quotation mark.
                */

                cell += '"';

                i++;

            } else {

                insideQuotes = !insideQuotes;
            }

        } else if (
            character === "," &&
            !insideQuotes
        ) {

            row.push(cell);
            cell = "";

        } else if (
            (character === "\n" || character === "\r") &&
            !insideQuotes
        ) {

            /*
                Handle Windows CRLF line endings.
            */

            if (
                character === "\r" &&
                nextCharacter === "\n"
            ) {
                i++;
            }

            row.push(cell);

            rows.push(row);

            row = [];
            cell = "";

        } else {

            cell += character;
        }
    }


    /*
        Add the final value if the file
        doesn't end with a line break.
    */

    if (
        cell.length > 0 ||
        row.length > 0
    ) {

        row.push(cell);

        rows.push(row);
    }


    return rows;
}


// --------------------------------------------------
// UPDATE APPLICATION
// --------------------------------------------------

function updateApplication() {

    updateStatistics();
    populateColumnSelect();
    updateSelectedColumnStats();
    renderTable();
}

function populateColumnSelect() {

    const previousValue = columnSelect.value;

    columnSelect.innerHTML =
        '<option value="">Select a column</option>';

        missingColumnSelect.innerHTML =
    '<option value="">Select column</option>';

    currentData.headers.forEach((header, index) => {

        const option =
            document.createElement("option");

        option.value = index;
        option.textContent = header;

        columnSelect.appendChild(option);

        const missingOption =
    document.createElement("option");

missingOption.value = index;
missingOption.textContent = header;

missingColumnSelect.appendChild(missingOption);
    });

    if (
        previousValue !== "" &&
        Number(previousValue) < currentData.headers.length
    ) {
        columnSelect.value = previousValue;
    }
}

// --------------------------------------------------
// STATISTICS
// --------------------------------------------------

function updateStatistics() {

    const rows = currentData.rows;

    rowCount.textContent =
        rows.length.toLocaleString();

    columnCount.textContent =
        currentData.headers.length.toLocaleString();

    duplicateCount.textContent =
        countDuplicates(rows).toLocaleString();

    missingCount.textContent =
        countMissingValues(rows).toLocaleString();
}


// --------------------------------------------------
// COUNT MISSING VALUES
// --------------------------------------------------

function countMissingValues(rows) {

    let missing = 0;

    rows.forEach(row => {

        row.forEach(cell => {

            if (cell.trim() === "") {
                missing++;
            }

        });

    });

    return missing;
}


// --------------------------------------------------
// COUNT DUPLICATES
// --------------------------------------------------

function countDuplicates(rows) {

    const seen = new Set();

    let duplicates = 0;


    rows.forEach(row => {

        const key = createRowKey(row);

        if (seen.has(key)) {

            duplicates++;

        } else {

            seen.add(key);
        }

    });


    return duplicates;
}


// --------------------------------------------------
// CREATE NORMALIZED ROW KEY
// --------------------------------------------------

function createRowKey(row) {

    /*
        Whitespace is ignored when identifying
        duplicate rows.
    */

    return JSON.stringify(
        row.map(cell => cell.trim())
    );
}


// --------------------------------------------------
// RENDER DATA TABLE
// --------------------------------------------------

function renderTable() {

    tableHead.innerHTML = "";
    tableBody.innerHTML = "";

    // FILTER DATA
    let rows = currentData.rows.filter(row => {

        if (!searchTerm) {
            return true;
        }

        return row.some(cell =>
            cell
                .toLowerCase()
                .includes(searchTerm)
        );
    });


    // SORT DATA
    if (sortColumnIndex !== null) {

        rows = [...rows].sort((a, b) => {

            const valueA =
                a[sortColumnIndex]?.trim() ?? "";

            const valueB =
                b[sortColumnIndex]?.trim() ?? "";

            const numberA = Number(valueA);
            const numberB = Number(valueB);

            let comparison;

            if (
                valueA !== "" &&
                valueB !== "" &&
                !Number.isNaN(numberA) &&
                !Number.isNaN(numberB)
            ) {
                comparison = numberA - numberB;
            } else {
                comparison = valueA.localeCompare(
                    valueB,
                    undefined,
                    {
                        numeric: true,
                        sensitivity: "base"
                    }
                );
            }

            return sortDirection === "asc"
                ? comparison
                : -comparison;
        });
    }


    // HEADER ROW
    const headerRow =
        document.createElement("tr");

    currentData.headers.forEach(
        (header, index) => {

            const th =
                document.createElement("th");

            th.textContent = header;

            th.style.cursor = "pointer";

            if (sortColumnIndex === index) {

                th.textContent +=
                    sortDirection === "asc"
                        ? " ▲"
                        : " ▼";
            }

            th.addEventListener(
                "click",
                () => {

                    if (sortColumnIndex === index) {

                        sortDirection =
                            sortDirection === "asc"
                                ? "desc"
                                : "asc";

                    } else {

                        sortColumnIndex = index;
                        sortDirection = "asc";
                    }

                    currentPage = 1;

                    renderTable();
                }
            );

            headerRow.appendChild(th);
        }
    );

    tableHead.appendChild(headerRow);


    // PAGINATION
    const totalPages =
        Math.max(
            1,
            Math.ceil(
                rows.length / rowsPerPage
            )
        );

    if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    const startIndex =
        (currentPage - 1) * rowsPerPage;

    const endIndex =
        startIndex + rowsPerPage;

    const pageRows =
        rows.slice(startIndex, endIndex);


    // TABLE BODY
    pageRows.forEach(row => {

        const tr =
            document.createElement("tr");

        row.forEach(cell => {

            const td =
                document.createElement("td");

            td.textContent =
                cell === ""
                    ? "—"
                    : cell;

            tr.appendChild(td);
        });

        tableBody.appendChild(tr);
    });


    // NO SEARCH RESULTS
    if (rows.length === 0) {

        const tr =
            document.createElement("tr");

        const td =
            document.createElement("td");

        td.colSpan =
            currentData.headers.length;

        td.textContent =
            "No matching records found.";

        td.style.textAlign = "center";
        td.style.padding = "24px";
        td.style.color = "#6b7280";

        tr.appendChild(td);

        tableBody.appendChild(tr);
    }


    // PAGE INFORMATION
    pageInfo.textContent =
        `Page ${currentPage} of ${totalPages}`;

    previousPageBtn.disabled =
        currentPage === 1;

    nextPageBtn.disabled =
        currentPage === totalPages;
}


// --------------------------------------------------
// REMOVE DUPLICATE ROWS
// --------------------------------------------------

removeDuplicatesBtn.addEventListener(
    "click",
    () => {

        const before =
            currentData.rows.length;

        const seen =
            new Set();


        currentData.rows =
            currentData.rows.filter(row => {

                const key =
                    createRowKey(row);


                if (seen.has(key)) {
                    return false;
                }


                seen.add(key);

                return true;
            });


        const removed =
            before - currentData.rows.length;


        updateApplication();


        showStatus(
            `${removed.toLocaleString()} duplicate row${removed === 1 ? "" : "s"} removed.`,
            "success"
        );
    }
);


// --------------------------------------------------
// REMOVE BLANK ROWS
// --------------------------------------------------

removeBlankRowsBtn.addEventListener(
    "click",
    () => {

        const before =
            currentData.rows.length;


        currentData.rows =
            currentData.rows.filter(row => {

                return row.some(
                    cell => cell.trim() !== ""
                );

            });


        const removed =
            before - currentData.rows.length;


        updateApplication();


        showStatus(
            `${removed.toLocaleString()} blank row${removed === 1 ? "" : "s"} removed.`,
            "success"
        );
    }
);


// --------------------------------------------------
// TRIM EXTRA SPACES
// --------------------------------------------------

trimSpacesBtn.addEventListener(
    "click",
    () => {

        let changedCells = 0;


        currentData.rows =
            currentData.rows.map(row => {

                return row.map(cell => {

                    const cleaned =
                        cell.trim();


                    if (cleaned !== cell) {
                        changedCells++;
                    }


                    return cleaned;
                });

            });


        currentData.headers =
            currentData.headers.map(header =>
                header.trim()
            );


        updateApplication();


        showStatus(
            `${changedCells.toLocaleString()} cell${changedCells === 1 ? "" : "s"} cleaned.`,
            "success"
        );
    }
);


// --------------------------------------------------
// RESET DATA
// --------------------------------------------------

resetDataBtn.addEventListener(
    "click",
    () => {

        if (!originalData) {
            return;
        }


        currentData =
            cloneDataset(originalData);


        updateApplication();


        showStatus(
            "Dataset restored to its original imported state.",
            "success"
        );
    }
);


// --------------------------------------------------
// DOWNLOAD CSV
// --------------------------------------------------

downloadBtn.addEventListener(
    "click",
    () => {

        if (!currentData) {
            return;
        }


        const csvRows = [];


        csvRows.push(
            currentData.headers
                .map(escapeCSVValue)
                .join(",")
        );


        currentData.rows.forEach(row => {

            csvRows.push(
                row
                    .map(escapeCSVValue)
                    .join(",")
            );

        });


        const csvContent =
            csvRows.join("\r\n");


        /*
            UTF-8 BOM improves compatibility
            with Microsoft Excel.
        */

        const blob =
            new Blob(
                ["\uFEFF" + csvContent],
                {
                    type:
                        "text/csv;charset=utf-8;"
                }
            );


        const url =
            URL.createObjectURL(blob);


        const link =
            document.createElement("a");


        const baseName =
            loadedFileName
                .replace(/\.csv$/i, "");


        link.href = url;

        link.download =
            `${baseName}-cleaned.csv`;


        document.body.appendChild(link);

        link.click();

        link.remove();


        URL.revokeObjectURL(url);


        showStatus(
            "Cleaned CSV downloaded successfully.",
            "success"
        );
    }
);


// --------------------------------------------------
// ESCAPE CSV VALUES
// --------------------------------------------------

function escapeCSVValue(value) {

    const stringValue =
        String(value);


    if (
        stringValue.includes(",") ||
        stringValue.includes('"') ||
        stringValue.includes("\n") ||
        stringValue.includes("\r")
    ) {

        return (
            '"' +
            stringValue.replace(/"/g, '""') +
            '"'
        );
    }


    return stringValue;
}


// --------------------------------------------------
// CLONE DATASET
// --------------------------------------------------

function cloneDataset(dataset) {

    return {

        headers:
            [...dataset.headers],

        rows:
            dataset.rows.map(
                row => [...row]
            )
    };
}


// --------------------------------------------------
// STATUS MESSAGE
// --------------------------------------------------

function showStatus(message, type = "success") {

    statusMessage.textContent =
        message;


    if (type === "error") {

        statusMessage.style.color =
            "#b91c1c";

    } else {

        statusMessage.style.color =
            "#15803d";
    }
}

searchInput.addEventListener(
    "input",
    () => {

        searchTerm =
            searchInput.value
                .trim()
                .toLowerCase();

        currentPage = 1;

        renderTable();
    }
);

previousPageBtn.addEventListener(
    "click",
    () => {

        if (currentPage > 1) {

            currentPage--;

            renderTable();
        }
    }
);

nextPageBtn.addEventListener(
    "click",
    () => {

        currentPage++;

        renderTable();
    }
);

columnSelect.addEventListener("change", () => {

    updateSelectedColumnStats();

});


function updateSelectedColumnStats() {

    if (!currentData || columnSelect.value === "") {

        statValues.textContent = "—";
        statMissing.textContent = "—";
        statUnique.textContent = "—";

        statExtraLabel.textContent = "Type";
        statExtra.textContent = "—";

        numericStats.classList.add("hidden");

        return;
    }


    const columnIndex =
        Number(columnSelect.value);


    const values =
        currentData.rows.map(row =>
            row[columnIndex] ?? ""
        );


    const nonEmptyValues =
        values.filter(value =>
            value.trim() !== ""
        );


    const missingValues =
        values.length - nonEmptyValues.length;


    const uniqueValues =
        new Set(
            nonEmptyValues.map(value =>
                value.trim()
            )
        );


    statValues.textContent =
        nonEmptyValues.length.toLocaleString();


    statMissing.textContent =
        missingValues.toLocaleString();


    statUnique.textContent =
        uniqueValues.size.toLocaleString();


    // Check whether every non-empty value is numeric
    const numericValues =
        nonEmptyValues
            .map(value => Number(value.trim()))
            .filter(value =>
                !Number.isNaN(value)
            );


    const isNumeric =
        nonEmptyValues.length > 0 &&
        numericValues.length === nonEmptyValues.length;


    if (isNumeric) {

        statExtraLabel.textContent = "Type";
        statExtra.textContent = "Numeric";

        numericStats.classList.remove("hidden");


        const sortedNumbers =
            [...numericValues].sort(
                (a, b) => a - b
            );


        const minimum =
            sortedNumbers[0];


        const maximum =
            sortedNumbers[
                sortedNumbers.length - 1
            ];


        const average =
            numericValues.reduce(
                (total, value) =>
                    total + value,
                0
            ) / numericValues.length;


        let median;

        const middle =
            Math.floor(
                sortedNumbers.length / 2
            );


        if (
            sortedNumbers.length % 2 === 0
        ) {

            median =
                (
                    sortedNumbers[middle - 1] +
                    sortedNumbers[middle]
                ) / 2;

        } else {

            median =
                sortedNumbers[middle];
        }


        statMin.textContent =
            formatNumber(minimum);

        statMax.textContent =
            formatNumber(maximum);

        statAverage.textContent =
            formatNumber(average);

        statMedian.textContent =
            formatNumber(median);

    } else {

        statExtraLabel.textContent = "Type";
        statExtra.textContent = "Text";

        numericStats.classList.add("hidden");
    }
}


function formatNumber(number) {

    return Number(number.toFixed(2))
        .toLocaleString();
}

fillMissingBtn.addEventListener(
    "click",
    () => {

        if (missingColumnSelect.value === "") {
            showStatus(
                "Select a column first.",
                "error"
            );
            return;
        }

        const replacement =
            missingValueInput.value.trim();

        if (replacement === "") {
            showStatus(
                "Enter a replacement value.",
                "error"
            );
            return;
        }

        const columnIndex =
            Number(missingColumnSelect.value);

        let changed = 0;

        currentData.rows.forEach(row => {

            if (
                (row[columnIndex] ?? "").trim() === ""
            ) {
                row[columnIndex] = replacement;
                changed++;
            }

        });

        updateApplication();

        showStatus(
            `${changed} missing value${changed === 1 ? "" : "s"} filled.`,
            "success"
        );
    }
);


removeMissingRowsBtn.addEventListener(
    "click",
    () => {

        if (missingColumnSelect.value === "") {
            showStatus(
                "Select a column first.",
                "error"
            );
            return;
        }

        const columnIndex =
            Number(missingColumnSelect.value);

        const before =
            currentData.rows.length;

        currentData.rows =
            currentData.rows.filter(row =>
                (row[columnIndex] ?? "").trim() !== ""
            );

        const removed =
            before - currentData.rows.length;

        updateApplication();

        showStatus(
            `${removed} row${removed === 1 ? "" : "s"} with missing values removed.`,
            "success"
        );
    }
);