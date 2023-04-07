const TABLE_MARKER = "<!-- TABLE -->";

export function render(
  sourceLanguage: string,
  targetLanguage: string,
  aligned: [string[], string[]][],
): string {
  const tableCell = (paras: string[]): string =>
    `<td>${paras.join("<p>")}</td>`;

  const tableBody = aligned
    .map(([leftParas, rightParas]) =>
      `<tr>${tableCell(leftParas)}${tableCell(rightParas)}</tr>`
    ).join("");

  const table =
    `<table id="bilingual-content"><thead><tr><th colspan="2"><span id="source-language">${sourceLanguage}</span> to <span id="target-language">${targetLanguage}</span> <a href="#" id="swap-columns">[SWAP]</a></th></tr></thead><tbody>${tableBody}</tbody></table>`;
  return TEMPLATE.replace(TABLE_MARKER, table);
}

const TEMPLATE = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">

  <title>bitextual render</title>

  <style>
    body {
      font-size: 23px;
      line-height: 33px;
    }
    th {
      text-align: left;
      padding: 1em;
    }
    td {
      vertical-align: top;
      width: 50%;
      padding: 0 1em 1em;
    }
  </style>
  </head>

  <body>
  ${TABLE_MARKER}
  <script>
  function swapLangs() {
    // Swap the source and target language names
    const sourceLanguage = document.getElementById("source-language");
    const targetLanguage = document.getElementById("target-language");
    const sourceLanguageContent = sourceLanguage.innerHTML;
    const targetLanguageContent = targetLanguage.innerHTML;
    sourceLanguage.innerHTML = targetLanguageContent;
    targetLanguage.innerHTML = sourceLanguageContent;
    
    // Swap the columns
    const tbody = document.getElementById("bilingual-content").getElementsByTagName("tbody").item(0);
    const rows = tbody.rows;

    for (const row of rows) {
        const cell1 = row.cells[0];
        const cell2 = row.cells[1];
        const cell1Content = cell1.innerHTML;
        cell1.innerHTML = cell2.innerHTML;
        cell2.innerHTML = cell1Content;
    }
  }
  
  document.getElementById("swap-columns").addEventListener("click", swapLangs);
  </script>
  </body>
</html>`;
