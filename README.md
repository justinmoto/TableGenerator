# HTML Table Generator

A modern, responsive HTML table generator built with Next.js, TypeScript, and Tailwind CSS. Create custom HTML tables with live preview and instant code generation, similar to cssgridgenerator.io but specifically for HTML `<table>` elements.

## Features

### Control Panel
- **Number of Rows**: Set table rows (1-20, default: 3)
- **Number of Columns**: Set table columns (1-20, default: 3)
- **Border Style**: Choose between solid, dashed, or no border
- **Border Color**: Color picker with hex input for precise control
- **Cell Padding**: Adjust cell padding in pixels (0-50px)
- **Cell Background Color**: Color picker with hex input for cell backgrounds
- **Sample Text**: Toggle to fill cells with sample text (Cell 1-1, Cell 1-2, etc.)

### Live Preview
- Real-time table preview that updates instantly as you change controls
- Responsive design that works on all screen sizes
- Clean, modern interface

### Code Output
- **HTML Code**: Generated HTML with inline styles for immediate use
- **CSS Code**: Separate CSS rules for better organization
- **Copy to Clipboard**: One-click copying of HTML or CSS code
- **Formatted Code**: Properly indented and formatted code output

### Responsive Design
- Mobile-first approach with responsive grid layout
- Control panel and preview adjust for smaller screens
- Touch-friendly interface

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **State Management**: React Hooks (useState, useCallback)
- **Build Tool**: Turbopack for fast development

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd tablegenerator
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Usage

1. **Configure Your Table**: Use the control panel on the left to adjust table properties
2. **Preview Changes**: See your table update in real-time in the preview panel
3. **Copy Code**: Click "Copy HTML" or "Copy CSS" to copy the generated code
4. **Use Anywhere**: Paste the code into your HTML files or CSS stylesheets

## Code Generation

The generator creates clean, semantic HTML with inline styles:

```html
<table style="border-collapse: collapse;">
  <tr>
    <td style="border: 1px solid #000000; padding: 8px; background-color: #ffffff;">Cell 1-1</td>
    <td style="border: 1px solid #000000; padding: 8px; background-color: #ffffff;">Cell 1-2</td>
  </tr>
</table>
```

And separate CSS for better organization:

```css
table {
  border-collapse: collapse;
}

td {
  border: 1px solid #000000;
  padding: 8px;
  background-color: #ffffff;
}
```

## Project Structure

```
app/
├── page.tsx          # Main table generator component
├── layout.tsx        # Root layout with metadata
└── globals.css       # Global styles
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

Inspired by [cssgridgenerator.io](https://cssgridgenerator.io) - a fantastic tool for CSS Grid layouts.
