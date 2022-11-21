const TABLE_MARKER = "<!-- TABLE -->";

export function render(aligned: [string[], string[]][]): string {
  const tableCell = (paras: string[]): string =>
    `<td>${paras.join("<p>")}</td>`;
  const tableBody = aligned.map(([leftParas, rightParas]) =>
    `<tr>${tableCell(leftParas)}${tableCell(rightParas)}</tr>`
  );
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
    td {
        vertical-align: top;
        width: 50%;
    }
  </style>
  </head>

  <body>
  ${TABLE_MARKER}
  </body>
</html>`;
