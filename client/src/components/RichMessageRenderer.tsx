import { useMemo, useEffect, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import 'katex/dist/katex.min.css';
// @ts-ignore
import katex from 'katex';

interface RichMessageRendererProps {
  content: string;
  className?: string;
}

export function RichMessageRenderer({ content, className = "" }: RichMessageRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const processedContent = useMemo(() => {
    // First, process LaTeX math expressions
    let processedText = content;
    
    // Handle display math ($$...$$)
    const displayMathRegex = /\$\$([^$]+)\$\$/g;
    const displayMathMatches: { match: string; latex: string; id: string }[] = [];
    
    processedText = processedText.replace(displayMathRegex, (match, latex) => {
      const id = `DISPLAY_MATH_${Math.random().toString(36).substr(2, 9)}`;
      displayMathMatches.push({ match, latex: latex.trim(), id });
      return `<div class="math-display" data-math-id="${id}"></div>`;
    });

    // Handle inline math ($...$)
    const inlineMathRegex = /\$([^$]+)\$/g;
    const inlineMathMatches: { match: string; latex: string; id: string }[] = [];
    
    processedText = processedText.replace(inlineMathRegex, (match, latex) => {
      const id = `INLINE_MATH_${Math.random().toString(36).substr(2, 9)}`;
      inlineMathMatches.push({ match, latex: latex.trim(), id });
      return `<span class="math-inline" data-math-id="${id}"></span>`;
    });

    // Configure marked for safe HTML rendering
    marked.setOptions({
      breaks: true,
      gfm: true,
    });

    // Convert markdown to HTML
    let htmlContent = marked(processedText) as string;
    
    // Sanitize HTML for security
    htmlContent = DOMPurify.sanitize(htmlContent, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'code', 'pre',
        'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'span', 'div', 'table', 'tr', 'td', 'th', 'thead', 'tbody',
        'blockquote', 'a', 'sup', 'sub'
      ],
      ALLOWED_ATTR: [
        'class', 'style', 'data-math-id', 'href', 'target', 'rel'
      ],
      ALLOWED_STYLES: {
        'color': [/^green$/, /^red$/, /^blue$/, /^orange$/, /^purple$/],
        'background-color': [/^#[0-9a-fA-F]{3,6}$/, /^rgb\(/],
        'font-weight': [/^bold$/, /^normal$/],
        'font-style': [/^italic$/, /^normal$/],
        'text-decoration': [/^underline$/, /^line-through$/]
      }
    });

    return {
      htmlContent,
      displayMathMatches,
      inlineMathMatches
    };
  }, [content]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    // Render display math
    processedContent.displayMathMatches.forEach(({ latex, id }) => {
      const mathElement = element.querySelector(`[data-math-id="${id}"]`);
      if (mathElement) {
        try {
          katex.render(latex, mathElement, {
            displayMode: true,
            throwOnError: false,
            errorColor: '#cc0000',
            strict: false
          });
        } catch (error) {
          mathElement.innerHTML = `<code style="color: red;">Error rendering math: ${latex}</code>`;
        }
      }
    });

    // Render inline math
    processedContent.inlineMathMatches.forEach(({ latex, id }) => {
      const mathElement = element.querySelector(`[data-math-id="${id}"]`);
      if (mathElement) {
        try {
          katex.render(latex, mathElement, {
            displayMode: false,
            throwOnError: false,
            errorColor: '#cc0000',
            strict: false
          });
        } catch (error) {
          mathElement.innerHTML = `<code style="color: red;">Error: ${latex}</code>`;
        }
      }
    });
  }, [processedContent]);

  return (
    <div 
      ref={containerRef}
      className={`rich-message-content ${className}`}
      dangerouslySetInnerHTML={{ __html: processedContent.htmlContent }}
    />
  );
}