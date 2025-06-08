import { BaseTool, type ToolResult } from '../base/base-tool';
import { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager';
import { z } from 'zod';

export interface DocsGeneratorToolParams {
  name?: string;
  description?: string;
  verbose?: boolean;
  defaultFormat?: 'markdown' | 'html' | 'asciidoc';
  includeExamples?: boolean;
  includeParams?: boolean;
  includeReturnTypes?: boolean;
  includeToc?: boolean;
}

export class DocsGeneratorTool extends BaseTool {
  static lc_name() {
    return 'DocsGeneratorTool';
  }

  defaultFormat: string;
  includeExamples: boolean;
  includeParams: boolean;
  includeReturnTypes: boolean;
  includeToc: boolean;

  constructor(params: DocsGeneratorToolParams = {}) {
    const {
      name = 'docs_generator',
      description = 'Generates documentation for code, APIs, and libraries',
      verbose = false,
      defaultFormat = 'markdown',
      includeExamples = true,
      includeParams = true,
      includeReturnTypes = true,
      includeToc = true,
    } = params;

    super({ name, description, verbose });
    
    this.defaultFormat = defaultFormat;
    this.includeExamples = includeExamples;
    this.includeParams = includeParams;
    this.includeReturnTypes = includeReturnTypes;
    this.includeToc = includeToc;
  }

  get inputSchema() {
    return {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'The title of the documentation',
        },
        description: {
          type: 'string',
          description: 'Description of what is being documented',
        },
        format: {
          type: 'string',
          enum: ['markdown', 'html', 'asciidoc'],
          default: this.defaultFormat,
          description: 'Output format for the documentation',
        },
        code: {
          type: 'string',
          description: 'The code to generate documentation for',
        },
        options: {
          type: 'object',
          properties: {
            includeExamples: {
              type: 'boolean',
              default: this.includeExamples,
              description: 'Whether to include code examples',
            },
            includeParams: {
              type: 'boolean',
              default: this.includeParams,
              description: 'Whether to include parameter documentation',
            },
            includeReturnTypes: {
              type: 'boolean',
              default: this.includeReturnTypes,
              description: 'Whether to include return type documentation',
            },
            includeToc: {
              type: 'boolean',
              default: this.includeToc,
              description: 'Whether to include a table of contents',
            },
          },
        },
      },
      required: ['title'],
    };
  }

  get outputSchema() {
    return {
      type: 'object',
      properties: {
        documentation: {
          type: 'string',
          description: 'The generated documentation',
        },
        format: {
          type: 'string',
          description: 'The format of the generated documentation',
        },
        sections: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of sections included in the documentation',
        },
      },
      required: ['documentation', 'format'],
    };
  }

  protected validateInput(input: any): { isValid: boolean; error?: string } {
    const schema = z.object({
      title: z.string().min(1, 'Title is required'),
      description: z.string().optional(),
      format: z.enum(['markdown', 'html', 'asciidoc']).optional(),
      code: z.string().optional(),
      options: z.object({
        includeExamples: z.boolean().optional(),
        includeParams: z.boolean().optional(),
        includeReturnTypes: z.boolean().optional(),
        includeToc: z.boolean().optional(),
      }).optional(),
    });

    try {
      schema.parse(input);
      return { isValid: true };
    } catch (error: any) {
      return { 
        isValid: false, 
        error: error.errors?.map((e: any) => e.message).join(', ') || 'Invalid input'
      };
    }
  }

  async _call(
    input: {
      title: string;
      description?: string;
      format?: 'markdown' | 'html' | 'asciidoc';
      code?: string;
      options?: {
        includeExamples?: boolean;
        includeParams?: boolean;
        includeReturnTypes?: boolean;
        includeToc?: boolean;
      };
    },
    _runManager?: CallbackManagerForToolRun
  ): Promise<ToolResult> {
    const {
      title,
      description = '',
      format = this.defaultFormat,
      code = '',
      options = {},
    } = input;

    try {
      // Merge default options with provided options
      const mergedOptions = {
        includeExamples: this.includeExamples,
        includeParams: this.includeParams,
        includeReturnTypes: this.includeReturnTypes,
        includeToc: this.includeToc,
        ...options,
      };

      // Parse the code to extract documentation (simplified implementation)
      const parsedCode = this.parseCode(code);

      // Generate documentation based on the selected format
      let documentation: string;
      const sections: string[] = [];

      switch (format) {
        case 'markdown':
          documentation = this.generateMarkdown(title, description, parsedCode, mergedOptions, sections);
          break;
        case 'html':
          documentation = this.generateHtml(title, description, parsedCode, mergedOptions, sections);
          break;
        case 'asciidoc':
          documentation = this.generateAsciiDoc(title, description, parsedCode, mergedOptions, sections);
          break;
        default:
          documentation = this.generateMarkdown(title, description, parsedCode, mergedOptions, sections);
      }

      return {
        output: {
          documentation,
          format,
          sections,
        },
        success: true,
      };
    } catch (error) {
      return {
        output: null,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate documentation',
      };
    }
  }

  private parseCode(code: string): any {
    // This is a simplified implementation
    // In a real implementation, this would parse the code to extract documentation
    return {
      functions: [
        {
          name: 'exampleFunction',
          description: 'An example function',
          params: [
            { name: 'input', type: 'string', description: 'Input parameter' },
          ],
          returns: { type: 'string', description: 'The result' },
          examples: [
            'const result = exampleFunction("test");',
          ],
        },
      ],
      classes: [],
      interfaces: [],
      types: [],
    };
  }

  private generateMarkdown(
    title: string,
    description: string,
    parsedCode: any,
    options: {
      includeExamples: boolean;
      includeParams: boolean;
      includeReturnTypes: boolean;
      includeToc: boolean;
    },
    sections: string[]
  ): string {
    let markdown = `# ${title}\n\n`;
    
    if (description) {
      markdown += `${description}\n\n`;
    }

    // Table of Contents
    if (options.includeToc) {
      markdown += '## Table of Contents\n\n';
      markdown += '- [Installation](#installation)\n';
      markdown += '- [Usage](#usage)\n';
      markdown += '- [API Reference](#api-reference)\n';
      markdown += '\n';
      sections.push('table-of-contents');
    }

    // Installation
    markdown += '## Installation\n\n';
    markdown += '```bash\nnpm install your-package\n```\n\n';
    sections.push('installation');

    // Usage
    markdown += '## Usage\n\n';
    markdown += '```javascript\nimport { exampleFunction } from \'your-package\';\n\n';
    markdown += 'const result = exampleFunction(\'test\');\n';
    markdown += 'console.log(result); // Output depends on implementation\n';
    markdown += '```\n\n';
    sections.push('usage');

    // API Reference
    markdown += '## API Reference\n\n';
    sections.push('api-reference');

    // Functions
    if (parsedCode.functions?.length) {
      markdown += '### Functions\n\n';
      
      for (const func of parsedCode.functions) {
        markdown += `#### ${func.name}()\n\n`;
        
        if (func.description) {
          markdown += `${func.description}\n\n`;
        }

        // Parameters
        if (options.includeParams && func.params?.length) {
          markdown += '**Parameters:**\n\n';
          markdown += '| Name | Type | Description |\n';
          markdown += '|------|------|-------------|\n';
          
          for (const param of func.params) {
            markdown += `| ${param.name} | \`${param.type}\` | ${param.description || ''} |\n`;
          }
          markdown += '\n';
        }

        // Return type
        if (options.includeReturnTypes && func.returns) {
          markdown += `**Returns:** \`${func.returns.type}\`  
`;
          if (func.returns.description) {
            markdown += `  
${func.returns.description}\n`;
          }
          markdown += '\n';
        }

        // Examples
        if (options.includeExamples && func.examples?.length) {
          markdown += '**Examples:**\n\n';
          for (const example of func.examples) {
            markdown += '```javascript\n';
            markdown += `${example}\n`;
            markdown += '```\n\n';
          }
        }
      }
    }

    return markdown;
  }

  private generateHtml(
    title: string,
    description: string,
    parsedCode: any,
    options: {
      includeExamples: boolean;
      includeParams: boolean;
      includeReturnTypes: boolean;
      includeToc: boolean;
    },
    sections: string[]
  ): string {
    // Simplified HTML generation
    let html = `<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
    code { background: #f4f4f4; padding: 2px 5px; border-radius: 3px; }
    pre { background: #f8f8f8; padding: 10px; border-radius: 5px; overflow-x: auto; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <h1>${title}</h1>
`;

    if (description) {
      html += `  <p>${description}</p>\n`;
    }

    // Table of Contents
    if (options.includeToc) {
      html += '  <h2>Table of Contents</h2>\n  <ul>\n';
      html += '    <li><a href="#installation">Installation</a></li>\n';
      html += '    <li><a href="#usage">Usage</a></li>\n';
      html += '    <li><a href="#api-reference">API Reference</a></li>\n';
      html += '  </ul>\n';
      sections.push('table-of-contents');
    }

    // Installation
    html += '  <h2 id="installation">Installation</h2>\n';
    html += '  <pre><code>npm install your-package</code></pre>\n';
    sections.push('installation');

    // Usage
    html += '  <h2 id="usage">Usage</h2>\n';
    html += '  <pre><code>import { exampleFunction } from \'your-package\';\n\n';
    html += 'const result = exampleFunction(\'test\');\n';
    html += 'console.log(result); // Output depends on implementation</code></pre>\n';
    sections.push('usage');

    // API Reference
    html += '  <h2 id="api-reference">API Reference</h2>\n';
    sections.push('api-reference');

    // Functions
    if (parsedCode.functions?.length) {
      html += '  <h3>Functions</h3>\n';
      
      for (const func of parsedCode.functions) {
        html += `    <h4>${func.name}()</h4>\n`;
        
        if (func.description) {
          html += `    <p>${func.description}</p>\n`;
        }

        // Parameters
        if (options.includeParams && func.params?.length) {
          html += '    <p><strong>Parameters:</strong></p>\n';
          html += '    <table>\n';
          html += '      <tr><th>Name</th><th>Type</th><th>Description</th></tr>\n';
          
          for (const param of func.params) {
            html += `      <tr><td>${param.name}</td><td><code>${param.type}</code></td><td>${param.description || ''}</td></tr>\n`;
          }
          html += '    </table>\n';
        }

        // Return type
        if (options.includeReturnTypes && func.returns) {
          html += `    <p><strong>Returns:</strong> <code>${func.returns.type}</code></p>\n`;
          if (func.returns.description) {
            html += `    <p>${func.returns.description}</p>\n`;
          }
        }

        // Examples
        if (options.includeExamples && func.examples?.length) {
          html += '    <p><strong>Examples:</strong></p>\n';
          for (const example of func.examples) {
            html += '    <pre><code>';
            html += `${example}\n`;
            html += '    </code></pre>\n';
          }
        }
      }
    }

    html += '</body>\n</html>';
    return html;
  }


  private generateAsciiDoc(
    title: string,
    description: string,
    parsedCode: any,
    options: {
      includeExamples: boolean;
      includeParams: boolean;
      includeReturnTypes: boolean;
      includeToc: boolean;
    },
    sections: string[]
  ): string {
    let asciidoc = `= ${title}
:doctype: book
:icons: font
:source-highlighter: highlight.js

`;

    if (description) {
      asciidoc += `${description}

`;
    }

    // Table of Contents
    if (options.includeToc) {
      asciidoc += '== Table of Contents

';
      asciidoc += '* <<installation,Installation>>
';
      asciidoc += '* <<usage,Usage>>
';
      asciidoc += '* <<api-reference,API Reference>>

';
      sections.push('table-of-contents');
    }

    // Installation
    asciidoc += '== Installation

[source,bash]
----
npm install your-package
----

';
    sections.push('installation');

    // Usage
    asciidoc += '== Usage

[source,javascript]
----
include::{examplesdir}/basic-usage.js[]
----

';
    sections.push('usage');

    // API Reference
    asciidoc += '== API Reference

';
    sections.push('api-reference');

    // Functions
    if (parsedCode.functions?.length) {
      asciidoc += '=== Functions

';
      
      for (const func of parsedCode.functions) {
        asciidoc += `==== ${func.name}()

`;
        
        if (func.description) {
          asciidoc += `${func.description}

`;
        }

        // Parameters
        if (options.includeParams && func.params?.length) {
          asciidoc += '.Parameters\n';
          asciidoc += '[cols="1,1,3"]\n';
          asciidoc += '|===\n';
          asciidoc += '| Name | Type | Description\n\n';
          
          for (const param of func.params) {
            asciidoc += `| ${param.name} | \`${param.type}\` | ${param.description || ''}\n`;
          }
          asciidoc += '|===\n\n';
        }

        // Return type
        if (options.includeReturnTypes && func.returns) {
          asciidoc += '.Returns\n';
          asciidoc += `\`${func.returns.type}\`::\n`;
          if (func.returns.description) {
            asciidoc += `${func.returns.description}\n`;
          }
          asciid += '\n';
        }

        // Examples
        if (options.includeExamples && func.examples?.length) {
          asciidoc += '.Examples\n';
          asciidoc += '[source,javascript]\n';
          asciidoc += '----\n';
          for (const example of func.examples) {
            asciidoc += `${example}\n`;
          }
          asciidoc += '----\n\n';
        }
      }
    }

    return asciidoc;
  }
}

export default DocsGeneratorTool;
