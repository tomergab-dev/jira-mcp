/**
 * Utilities for formatting text and other data for Jira API
 */

/**
 * Converts plain text to Atlassian Document Format (ADF)
 * Supports paragraphs, bullet lists, numbered lists, and headings
 * @param text - Plain text to convert to ADF
 * @returns ADF document object with the text content
 */
export function convertToADF(text: string) {
  if (!text || !text.trim()) {
    return {
      version: 1,
      type: "doc",
      content: [],
    };
  }

  const lines = text.split("\n");
  const content: any[] = [];
  
  let currentList: any = null;
  let currentListType: "bullet" | "ordered" | null = null;
  let codeBlockContent: string[] = [];
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1] || "";
    const trimmedLine = line.trim();

    // Handle code blocks
    if (trimmedLine === "```" || trimmedLine.startsWith("``` ")) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockContent = [];
        continue;
      } else {
        inCodeBlock = false;
        content.push({
          type: "codeBlock",
          attrs: {
            language: trimmedLine.startsWith("``` ") ? trimmedLine.substring(4) : "plain",
          },
          content: [{
            type: "text",
            text: codeBlockContent.join("\n"),
          }],
        });
        continue;
      }
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Skip empty lines between paragraphs
    if (trimmedLine === "") {
      currentList = null;
      currentListType = null;
      continue;
    }

    // Handle bullet points
    if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("* ")) {
      const listItem = trimmedLine.substring(2);
      if (currentListType !== "bullet") {
        currentList = {
          type: "bulletList",
          content: [],
        };
        content.push(currentList);
        currentListType = "bullet";
      }
      currentList.content.push({
        type: "listItem",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: listItem,
              },
            ],
          },
        ],
      });
      continue;
    }

    // Handle numbered lists
    if (/^\d+\.\s/.test(trimmedLine)) {
      const listItem = trimmedLine.replace(/^\d+\.\s/, "");
      if (currentListType !== "ordered") {
        currentList = {
          type: "orderedList",
          content: [],
        };
        content.push(currentList);
        currentListType = "ordered";
      }
      currentList.content.push({
        type: "listItem",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: listItem,
              },
            ],
          },
        ],
      });
      continue;
    }

    // Handle headings (lines ending with ":" or starting with # markers)
    if ((trimmedLine.endsWith(":") && nextLine.trim() === "") || trimmedLine.startsWith("#")) {
      let level = 3; // Default heading level
      let text = trimmedLine;
      
      // Handle markdown style headings
      if (trimmedLine.startsWith("#")) {
        const match = trimmedLine.match(/^(#+)\s+(.*)/);
        if (match) {
          level = Math.min(match[1].length, 6);
          text = match[2];
        }
      }
      
      content.push({
        type: "heading",
        attrs: { level },
        content: [
          {
            type: "text",
            text,
          },
        ],
      });
      continue;
    }

    // Regular paragraph
    currentList = null;
    currentListType = null;
    
    // Check for bold/italic formatting
    const textContent = parseInlineFormatting(trimmedLine);
    
    content.push({
      type: "paragraph",
      content: textContent,
    });
  }

  return {
    version: 1,
    type: "doc",
    content,
  };
}

/**
 * Parse inline formatting like bold, italic, and code
 * @param text Text to parse for formatting
 * @returns Array of formatted text nodes
 */
function parseInlineFormatting(text: string): any[] {
  let result: any[] = [];
  let currentText = "";
  
  // Simple parsing for common markdown-style formatting
  // This is a basic implementation - real implementation would need more robust parsing
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1] || "";
    const prevChar = text[i - 1] || "";
    
    // Bold with **
    if (char === "*" && nextChar === "*" && (i === 0 || prevChar !== "\\")) {
      if (currentText) {
        result.push({ type: "text", text: currentText });
        currentText = "";
      }
      
      // Find the closing **
      const start = i + 2;
      let end = text.indexOf("**", start);
      if (end === -1) end = text.length;
      
      result.push({ 
        type: "text", 
        text: text.substring(start, end),
        marks: [{ type: "strong" }]
      });
      
      i = end + 1;
      continue;
    }
    
    // Italic with *
    if (char === "*" && nextChar !== "*" && (i === 0 || prevChar !== "\\")) {
      if (currentText) {
        result.push({ type: "text", text: currentText });
        currentText = "";
      }
      
      // Find the closing *
      const start = i + 1;
      let end = text.indexOf("*", start);
      if (end === -1) end = text.length;
      
      result.push({ 
        type: "text", 
        text: text.substring(start, end),
        marks: [{ type: "em" }]
      });
      
      i = end;
      continue;
    }
    
    // Inline code with `
    if (char === "`" && (i === 0 || prevChar !== "\\")) {
      if (currentText) {
        result.push({ type: "text", text: currentText });
        currentText = "";
      }
      
      // Find the closing `
      const start = i + 1;
      let end = text.indexOf("`", start);
      if (end === -1) end = text.length;
      
      result.push({ 
        type: "text", 
        text: text.substring(start, end),
        marks: [{ type: "code" }]
      });
      
      i = end;
      continue;
    }
    
    currentText += char;
  }
  
  if (currentText) {
    result.push({ type: "text", text: currentText });
  }
  
  return result.length ? result : [{ type: "text", text }];
}

/**
 * Formats a JQL query with proper escaping
 * @param query Base JQL query string
 * @param params Parameters to substitute into the query
 * @returns Formatted JQL query
 */
export function formatJQL(query: string, params: Record<string, any> = {}): string {
  let formattedQuery = query;
  
  for (const [key, value] of Object.entries(params)) {
    const placeholder = `\${${key}}`;
    
    if (formattedQuery.includes(placeholder)) {
      let formattedValue: string;
      
      if (typeof value === 'string') {
        // Quote strings that contain spaces or special characters
        formattedValue = /[ "'\\]/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value;
      } else if (Array.isArray(value)) {
        // Handle arrays by formatting as "value1", "value2"
        formattedValue = value.map(v => 
          typeof v === 'string' && /[ "'\\]/.test(v) 
            ? `"${v.replace(/"/g, '\\"')}"` 
            : String(v)
        ).join(', ');
      } else {
        formattedValue = String(value);
      }
      
      formattedQuery = formattedQuery.replace(placeholder, formattedValue);
    }
  }
  
  return formattedQuery;
} 