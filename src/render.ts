const TABLE_MARKER = "<!-- TABLE -->";

export function render(aligned: [string[], string[]][]): string {
  const tableCell = (paras: string[]): string =>
    `<td>${paras.join("<p>")}</td>`;
  const tableBody = aligned
    .map(([leftParas, rightParas]) =>
      `<tr>${tableCell(leftParas)}${tableCell(rightParas)}</tr>`
    ).join("");
  const table = `<table>${tableBody}</table>`;
  return addTable(table);
}

function addTable(tableHtml: string): string {
  return TEMPLATE.replace(TABLE_MARKER, tableHtml);
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
