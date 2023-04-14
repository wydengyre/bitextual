const TABLE_MARKER = "<!-- TABLE -->";

const HIGHLIGHT_TEXT = "[HIGHLIGHT SENTENCE MATCHES]";
const UNHIGHLIGHT_TEXT = "[UNHIGHLIGHT SENTENCE MATCHES]";

export function render(
  sourceLanguage: string,
  targetLanguage: string,
  alignedParagraphs: [string[], string[]][],
  alignedSentences: [string[], string[]][],
): string {
  const sentenceIdxDigits = Math.ceil(Math.log10(alignedSentences.length));
  const maxColors = 4;

  // label each sentence with an id on the left side
  let color = 0;
  let sentenceIdx = 0;
  let alignedParaIdx = 0;
  let innerParaIdx = 0;
  let paraCursor = 0;
  for (const [leftSentences] of alignedSentences) {
    for (const leftSentence of leftSentences) {
      // stringify sentenceIdx and pad with 0s to sentenceIdxDigits
      const sentenceIdxStr = sentenceIdx.toString().padStart(
        sentenceIdxDigits,
        "0",
      );

      const replacementSentence =
        `<span class="sentence s-${sentenceIdxStr} color-${color}">${leftSentence}</span>`;

      // replace paraToCheck text starting at index paraCursor with replacementSentence
      let paraToCheck = alignedParagraphs[alignedParaIdx][0][innerParaIdx];
      let sentenceStart = paraToCheck.indexOf(leftSentence, paraCursor);

      // we didn't find the sentence in this paragraph, so we need to move to the next one
      while (sentenceStart < 0) {
        innerParaIdx++;
        paraCursor = 0;
        if (innerParaIdx >= alignedParagraphs[alignedParaIdx][0].length) {
          // we've reached the end of the paragraph, so we need to move to the next one
          alignedParaIdx++;
          innerParaIdx = 0;
        }
        paraToCheck = alignedParagraphs[alignedParaIdx][0][innerParaIdx];
        sentenceStart = paraToCheck.indexOf(leftSentence, paraCursor);
      }

      const sentenceEnd = sentenceStart + leftSentence.length;
      const before = paraToCheck.substring(0, sentenceStart);
      const after = paraToCheck.substring(sentenceEnd);

      alignedParagraphs[alignedParaIdx][0][innerParaIdx] = before +
        replacementSentence + after;
      paraCursor = sentenceEnd + replacementSentence.length -
        leftSentence.length;
    }
    sentenceIdx++;
    color++;
    if (color === maxColors) {
      color = 0;
    }
  }

  // label each sentence with an id on the right side
  sentenceIdx = 0;
  alignedParaIdx = 0;
  innerParaIdx = 0;
  paraCursor = 0;
  color = 0;
  for (const [_, rightSentences] of alignedSentences) {
    for (const rightSentence of rightSentences) {
      // stringify sentenceIdx and pad with 0s to sentenceIdxDigits
      const sentenceIdxStr = sentenceIdx.toString().padStart(
        sentenceIdxDigits,
        "0",
      );
      const replacementSentence =
        `<span class="sentence s-${sentenceIdxStr} color-${color}">${rightSentence}</span>`;

      // replace paraToCheck text starting at index paraCursor with replacementSentence
      let paraToCheck = alignedParagraphs[alignedParaIdx][1][innerParaIdx];
      let sentenceStart = paraToCheck.indexOf(rightSentence, paraCursor);

      // we didn't find the sentence in this paragraph, so we need to move to the next one
      while (sentenceStart < 0) {
        innerParaIdx++;
        paraCursor = 0;
        if (innerParaIdx >= alignedParagraphs[alignedParaIdx][1].length) {
          // we've reached the end of the paragraph, so we need to move to the next one
          alignedParaIdx++;
          innerParaIdx = 0;
        }
        paraToCheck = alignedParagraphs[alignedParaIdx][1][innerParaIdx];
        sentenceStart = paraToCheck.indexOf(rightSentence, paraCursor);
      }

      const sentenceEnd = sentenceStart + rightSentence.length;
      const before = paraToCheck.substring(0, sentenceStart);
      const after = paraToCheck.substring(sentenceEnd);

      alignedParagraphs[alignedParaIdx][1][innerParaIdx] = before +
        replacementSentence + after;
      paraCursor = sentenceEnd + replacementSentence.length -
        rightSentence.length;
    }
    sentenceIdx++;
    color++;
    if (color === maxColors) {
      color = 0;
    }
  }

  const tableCell = (paras: string[]): string =>
    `<td>${paras.join("<p>")}</td>`;

  const tableBody = alignedParagraphs
    .map(([leftParas, rightParas]) =>
      `<tr>${tableCell(leftParas)}${tableCell(rightParas)}</tr>`
    ).join("");

  const swapButton = '<a href="#" id="swap-columns">[SWAP]</a>';
  const swapControl =
    `<span id="source-language">${sourceLanguage}</span> to <span id="target-language">${targetLanguage}</span> ${swapButton}`;
  const highlightButton =
    `<a href="#" id="highlight-sentences">${HIGHLIGHT_TEXT}</a>`;
  const table = `<table id="bilingual-content">
    <thead><tr><th colspan="2">${swapControl} ${highlightButton}</th></tr></thead>
    <tbody>${tableBody}</tbody>
</table>`;
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
    #highlight-sentences {
      margin-left: 2em;
    }
    
    .highlight-sentences .color-0 {
        background-color: rgb(255, 191, 206);
    }
    .highlight-sentences .color-1 {
        background-color: rgb(255, 204, 153);
    }
    .highlight-sentences .color-2 {
        background-color: rgb(247, 237, 148);
    }
    .highlight-sentences .color-3 {
        background-color: rgb(178, 205, 251);
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
  
  function highlightSentences() {
      const table = document.getElementById("bilingual-content");
      table.classList.toggle("highlight-sentences");
      
      const highlightButton = document.getElementById("highlight-sentences");
      if (highlightButton.innerHTML === "${HIGHLIGHT_TEXT}") {  
        highlightButton.innerHTML = "${UNHIGHLIGHT_TEXT}";
      } else {
        highlightButton.innerHTML = "${HIGHLIGHT_TEXT}";
      }
  }
  
  document.getElementById("swap-columns").addEventListener("click", swapLangs);
  document.getElementById("highlight-sentences").addEventListener("click", highlightSentences);
  </script>
  </body>
</html>`;
