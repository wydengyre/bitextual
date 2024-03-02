const TABLE_MARKER = "<!-- TABLE -->";

export function render(
	sourceLang: string,
	targetLang: string,
	alignedParagraphs: [string[], string[]][],
): string {
	const tableCell = (paras: string[], lang: string): string =>
		`<td lang="${lang}">${paras.join("<p>")}</td>`;

	const tableBody = alignedParagraphs
		.map(([sourceParas, targetParas]) => {
			const leftCell = tableCell(sourceParas, sourceLang);
			const rightCell = tableCell(targetParas, targetLang);
			return `<tr>${leftCell}${rightCell}</tr>`;
		})
		.join("");

	const swapButton = '<button type="button" id="swap-columns">swap</button>';
	const swapControl = `<span id="source-language">${capitalize(
		sourceLang,
	)}</span> to <span id="target-language">${capitalize(
		targetLang,
	)}</span> ${swapButton}`;
	const table = `<table id="bilingual-content">
    <thead><tr><th colspan="2"><a href="https://bitextual.net/">Bitextual</a>:
        ${swapControl}</th></tr></thead>
    <tbody>${tableBody}</tbody>
</table>`;
	return TEMPLATE.replace(TABLE_MARKER, table);
}

function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

const TEMPLATE = `<!DOCTYPE html>
<html lang="en">
  <head>
  <meta charset="utf-8">
  <title>bitextual parallel book</title>
  <style>
    body {
      font-size: 23px;
      line-height: 33px;
    }

    thead {
      position: sticky;
      top: 0;
      background-color: #fff;
    }

    th {
      text-align: left;
      padding: 1em;
      font-family: Arial, sans-serif;
    }

    th button {
      font-size: inherit;
    }

    td {
      vertical-align: top;
      width: 50%;
      padding: 0 1em 1em;
    }

    #swap-columns {
      margin-left: 1em;;
    }

    #highlight-sentences {
        float: right;
    }

    .highlight-sentences .color-0 {
        background-color: rgb(255, 191, 206);
    }
    .highlight-sentences .color-1 {
        background-color: rgb(255, 204, 153);
    }
    .highlight-sentences .color-2 {
        background-color: rgb(178, 205, 251);
    }

    .selected-sentence {
        background-color: rgb(247, 237, 148) !important;
    }

    @media print{
        thead {
            display: none;
        }
        body {
          font-size: 14px;
          line-height: 18px;
        }
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
    sourceLanguage.innerHTML = targetLanguage.innerHTML
    targetLanguage.innerHTML = sourceLanguageContent;

    const fragment = document.createDocumentFragment();

    // Swap the columns
    const table = document.getElementById("bilingual-content");
    const tbody = table.getElementsByTagName("tbody").item(0);
    const rows = tbody.rows;

    const newTbody = document.createElement("tbody");

    for (const row of rows) {
        const newRow = document.createElement("tr");
        const cells = row.cells;
        const cell1 = cells[0];
        const cell2 = cells[1];

        newRow.appendChild(cell2);
        newRow.appendChild(cell1);
        newTbody.appendChild(newRow);
    }
    fragment.appendChild(newTbody);

    table.replaceChild(fragment, tbody);
  }

  document.getElementById("swap-columns").addEventListener("click", swapLangs);
  </script>
  </body>
</html>`;
