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
    `<table><thead><tr><th colspan="2">${sourceLanguage} to ${targetLanguage}</th></tr></thead>${tableBody}</table>`;
  return TEMPLATE.replace(TABLE_MARKER, table);
}

const TEMPLATE = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">

  <title>Render</title>

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
  </body>
</html>`;
