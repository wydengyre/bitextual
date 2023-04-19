const TABLE_MARKER = "<!-- TABLE -->";

const HIGHLIGHT_TEXT = "[HIGHLIGHT SENTENCE MATCHES]";
const UNHIGHLIGHT_TEXT = "[UNHIGHLIGHT SENTENCE MATCHES]";

export function render(
  sourceLanguage: string,
  targetLanguage: string,
  alignedParagraphs: [string[], string[]][],
  alignedSentences: [string[], string[]][],
): string {
  const leftParagraphs = alignedParagraphs.map(([leftParas]) => leftParas);
  const rightParagraphs = alignedParagraphs.map(([, rightParas]) => rightParas);
  const leftSentences = alignedSentences.map(([leftSentences]) =>
    leftSentences
  );
  const rightSentences = alignedSentences.map(([, rightSentences]) =>
    rightSentences
  );

  labelSentences(leftSentences, leftParagraphs);
  labelSentences(rightSentences, rightParagraphs);

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

function labelSentences(
  alignedSentences: string[][],
  alignedParagraphs: string[][],
) {
  const sentenceIdxDigits = Math.ceil(Math.log10(alignedSentences.length));
  const maxColors = 4;

  let sentenceIdx = 0;
  let alignedParaIdx = 0;
  let innerParaIdx = 0;
  let paraCursor = 0;
  let color = 0;

  // label each sentence with an id
  for (const innerSentences of alignedSentences) {
    for (const innerSentence of innerSentences) {
      // stringify sentenceIdx and pad with 0s to sentenceIdxDigits
      const sentenceIdxStr = sentenceIdx.toString().padStart(
        sentenceIdxDigits,
        "0",
      );
      const replacementSentence =
        `<span class="sentence s-${sentenceIdxStr} color-${color}">${innerSentence}</span>`;

      // replace paraToCheck text starting at index paraCursor with replacementSentence
      let paraToCheck = alignedParagraphs[alignedParaIdx][innerParaIdx];
      let sentenceStart = paraToCheck.indexOf(innerSentence, paraCursor);

      // we didn't find the sentence in this paragraph, so we need to move to the next one
      while (sentenceStart < 0) {
        innerParaIdx++;
        paraCursor = 0;
        if (innerParaIdx >= alignedParagraphs[alignedParaIdx].length) {
          // we've reached the end of the paragraph, so we need to move to the next one
          alignedParaIdx++;
          innerParaIdx = 0;
        }
        paraToCheck = alignedParagraphs[alignedParaIdx][innerParaIdx];
        sentenceStart = paraToCheck.indexOf(innerSentence, paraCursor);
      }

      const sentenceEnd = sentenceStart + innerSentence.length;
      const before = paraToCheck.substring(0, sentenceStart);
      const after = paraToCheck.substring(sentenceEnd);

      alignedParagraphs[alignedParaIdx][innerParaIdx] = before +
        replacementSentence + after;
      paraCursor = sentenceEnd + replacementSentence.length -
        innerSentence.length;
    }
    sentenceIdx++;
    color++;
    if (color === maxColors) {
      color = 0;
    }
  }
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
    
    .selected-sentence {
        border: 1px dashed #222;
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
  
  const SELECTED_SENTENCE_CLASS = "selected-sentence";
  let selectedSentences = null;
  function surroundMatchingSentences(event) {
      if (selectedSentences !== null) {
        selectedSentences.forEach((sentence) => {
            sentence.classList.remove(SELECTED_SENTENCE_CLASS);
        })     
      }
      
      const cl = Array(...event.target.classList);
      const sentenceClass = cl.find((c) => c.startsWith("s-"));
      const sentenceSelector = "." + sentenceClass;
      selectedSentences = document.querySelectorAll(sentenceSelector);
      selectedSentences.forEach((sentence) => {
          sentence.classList.add(SELECTED_SENTENCE_CLASS);
      });
  }
  
  document.getElementById("swap-columns").addEventListener("click", swapLangs);
  document.getElementById("highlight-sentences").addEventListener("click", highlightSentences);
  document.querySelectorAll(".sentence").forEach((span) => {
      span.addEventListener("mouseover", surroundMatchingSentences);
  });
  </script>
  </body>
</html>`;
