import { Language, language, LanguageName } from "./language.ts";

const TABLE_MARKER = "<!-- TABLE -->";

const HIGHLIGHT_TEXT = "highlight sentence matches";
const UNHIGHLIGHT_TEXT = "unhighlight sentence matches";

export function render(
  sourceLanguage: LanguageName,
  targetLanguage: LanguageName,
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

  const sourceLanguageSubtag = language[sourceLanguage];
  const targetLanguageSubtag = language[targetLanguage];

  labelSentences(leftSentences, leftParagraphs);
  labelSentences(rightSentences, rightParagraphs);

  const tableCell = (paras: string[], lang: Language): string =>
    `<td lang="${lang}">${paras.join("<p>")}</td>`;

  const tableBody = alignedParagraphs
    .map(([sourceParas, targetParas]) => {
      const leftCell = tableCell(sourceParas, sourceLanguageSubtag);
      const rightCell = tableCell(targetParas, targetLanguageSubtag);
      return `<tr>${leftCell}${rightCell}</tr>`;
    })
    .join("");

  const swapButton = '<button type="button" id="swap-columns">swap</button>';
  const swapControl = `<span id="source-language">${
    capitalize(sourceLanguage)
  }</span> to <span id="target-language">${
    capitalize(targetLanguage)
  }</span> ${swapButton}`;
  const highlightButton =
    `<button type="button" id="highlight-sentences">${HIGHLIGHT_TEXT}</button>`;
  const table = `<table id="bilingual-content">
    <thead><tr><th colspan="2"><a href="https://bitextual.net/">Bitextual</a>:
        ${swapControl} ${highlightButton}</th></tr></thead>
    <tbody>${tableBody}</tbody>
</table>`;
  return TEMPLATE.replace(TABLE_MARKER, table);
}

function labelSentences(
  alignedSentences: string[][],
  alignedParagraphs: string[][],
) {
  const sentenceIdxDigits = Math.ceil(Math.log10(alignedSentences.length));
  const maxColors = 3;

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
