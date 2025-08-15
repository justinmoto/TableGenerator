'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface TableConfig {
  rows: number;
  columns: number;
  gap: number;
  borderStyle: 'solid' | 'dashed' | 'none';
  borderColor: string;
  cellPadding: number;
  cellBackgroundColor: string;
  borderRadius: number;
  fillSampleText: boolean;
}

interface MergedCell {
  id: number;
  rowStart: number;
  rowEnd: number;
  colStart: number;
  colEnd: number;
  content: string;
}

interface DragState {
  isDragging: boolean;
  cellId: number | null;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  currentX: number;
  currentY: number;
  isResizing: boolean;
}

export default function TableGenerator() {
  const [config, setConfig] = useState<TableConfig>({
    rows: 3,
    columns: 3,
    gap: 8,
    borderStyle: 'solid',
    borderColor: '#000000',
    cellPadding: 8,
    cellBackgroundColor: '#ffffff',
    borderRadius: 0,
    fillSampleText: false,
  });

  const [mergedCells, setMergedCells] = useState<MergedCell[]>([]);
  const [nextCellId, setNextCellId] = useState(1);
  const [selectedCells, setSelectedCells] = useState<{row: number, col: number}[]>([]);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    cellId: null,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    currentX: 0,
    currentY: 0,
    isResizing: false,
  });

  const tableRef = useRef<HTMLDivElement>(null);
  const dragPreviewRef = useRef<HTMLDivElement>(null);

  // Check if a cell is part of a merged cell
  const isCellMerged = (row: number, col: number) => {
    return mergedCells.some(cell => 
      row >= cell.rowStart && row < cell.rowEnd && 
      col >= cell.colStart && col < cell.colEnd
    );
  };

  // Get merged cell for a specific position
  const getMergedCell = (row: number, col: number) => {
    return mergedCells.find(cell => 
      row >= cell.rowStart && row < cell.rowEnd && 
      col >= cell.colStart && col < cell.colEnd
    );
  };

  // Handle cell click for merging
  const handleCellClick = (row: number, col: number) => {
    if (dragState.isDragging || dragState.isResizing) return; // Don't handle clicks while dragging or resizing
    
    if (isCellMerged(row, col)) {
      // Remove merged cell if clicked
      setMergedCells(prev => prev.filter(cell => 
        !(row >= cell.rowStart && row < cell.rowEnd && 
          col >= cell.colStart && col < cell.colEnd)
      ));
      setSelectedCells([]);
    } else {
      // Add to selection
      const newSelection = [...selectedCells, { row, col }];
      setSelectedCells(newSelection);
      
      // If we have 2 or more cells selected, create merged cell
      if (newSelection.length >= 2) {
        const minRow = Math.min(...newSelection.map(c => c.row));
        const maxRow = Math.max(...newSelection.map(c => c.row));
        const minCol = Math.min(...newSelection.map(c => c.col));
        const maxCol = Math.max(...newSelection.map(c => c.col));
        
        // Allow any selection of 2 or more cells, not just perfect rectangles
        const newMergedCell: MergedCell = {
          id: nextCellId,
          rowStart: minRow,
          rowEnd: maxRow + 1,
          colStart: minCol,
          colEnd: maxCol + 1,
          content: config.fillSampleText ? `Cell ${nextCellId}` : ''
        };
        
        setMergedCells(prev => [...prev, newMergedCell]);
        setNextCellId(prev => prev + 1);
        setSelectedCells([]);
      }
    }
  };

  // Handle drag start (for moving)
  const handleDragStart = (e: React.MouseEvent, cellId: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = e.currentTarget.getBoundingClientRect();
    setDragState({
      isDragging: true,
      isResizing: false,
      cellId,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      currentX: e.clientX,
      currentY: e.clientY,
    });

    // Add dragging class to body
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  };

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent, cellId: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragState({
      isDragging: false,
      isResizing: true,
      cellId,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: 0,
      offsetY: 0,
      currentX: e.clientX,
      currentY: e.clientY,
    });

    // Add resizing class to body
    document.body.style.cursor = 'nw-resize';
    document.body.style.userSelect = 'none';
  };

  // Handle drag move
  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!dragState.isDragging || !dragState.cellId || !tableRef.current) return;

    setDragState(prev => ({
      ...prev,
      currentX: e.clientX,
      currentY: e.clientY,
    }));

    const tableRect = tableRef.current.getBoundingClientRect();
    const cellWidth = (tableRect.width - (config.columns - 1) * config.gap) / config.columns;
    const cellHeight = (tableRect.height - (config.rows - 1) * config.gap) / config.rows;

    const newCol = Math.floor((e.clientX - tableRect.left) / (cellWidth + config.gap));
    const newRow = Math.floor((e.clientY - tableRect.top) / (cellHeight + config.gap));

    // Ensure the new position is within bounds
    const clampedCol = Math.max(0, Math.min(newCol, config.columns - 1));
    const clampedRow = Math.max(0, Math.min(newRow, config.rows - 1));

    setMergedCells(prev => prev.map(cell => {
      if (cell.id === dragState.cellId) {
        const rowSpan = cell.rowEnd - cell.rowStart;
        const colSpan = cell.colEnd - cell.colStart;
        
        return {
          ...cell,
          rowStart: clampedRow,
          rowEnd: Math.min(clampedRow + rowSpan, config.rows),
          colStart: clampedCol,
          colEnd: Math.min(clampedCol + colSpan, config.columns),
        };
      }
      return cell;
    }));
  }, [dragState.isDragging, dragState.cellId, config.rows, config.columns, config.gap]);

  // Handle resize move
  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!dragState.isResizing || !dragState.cellId || !tableRef.current) return;

    setDragState(prev => ({
      ...prev,
      currentX: e.clientX,
      currentY: e.clientY,
    }));

    const tableRect = tableRef.current.getBoundingClientRect();
    const cellWidth = (tableRect.width - (config.columns - 1) * config.gap) / config.columns;
    const cellHeight = (tableRect.height - (config.rows - 1) * config.gap) / config.rows;

    const newCol = Math.floor((e.clientX - tableRect.left) / (cellWidth + config.gap));
    const newRow = Math.floor((e.clientY - tableRect.top) / (cellHeight + config.gap));

    // Ensure the new size is within bounds
    const clampedCol = Math.max(0, Math.min(newCol, config.columns - 1));
    const clampedRow = Math.max(0, Math.min(newRow, config.rows - 1));

    setMergedCells(prev => prev.map(cell => {
      if (cell.id === dragState.cellId) {
        return {
          ...cell,
          rowEnd: Math.max(cell.rowStart + 1, Math.min(clampedRow + 1, config.rows)),
          colEnd: Math.max(cell.colStart + 1, Math.min(clampedCol + 1, config.columns)),
        };
      }
      return cell;
    }));
  }, [dragState.isResizing, dragState.cellId, config.rows, config.columns, config.gap]);

  // Handle drag/resize end
  const handleDragEnd = useCallback(() => {
    setDragState({
      isDragging: false,
      isResizing: false,
      cellId: null,
      startX: 0,
      startY: 0,
      offsetX: 0,
      offsetY: 0,
      currentX: 0,
      currentY: 0,
    });

    // Remove dragging styles
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  // Add/remove event listeners
  useEffect(() => {
    if (dragState.isDragging || dragState.isResizing) {
      const moveHandler = dragState.isResizing ? handleResizeMove : handleDragMove;
      document.addEventListener('mousemove', moveHandler);
      document.addEventListener('mouseup', handleDragEnd);
      return () => {
        document.removeEventListener('mousemove', moveHandler);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [dragState.isDragging, dragState.isResizing, handleDragMove, handleResizeMove, handleDragEnd]);

  // Generate table HTML with merged cells
  const generateTableHTML = useCallback(() => {
    const borderStyle = config.borderStyle === 'none' ? 'none' : `1px ${config.borderStyle} ${config.borderColor}`;
    
    let html = '<table style="border-collapse: collapse;">\n';
    
    for (let i = 0; i < config.rows; i++) {
      html += '  <tr>\n';
      for (let j = 0; j < config.columns; j++) {
        const mergedCell = getMergedCell(i, j);
        const isSelected = selectedCells.some(cell => cell.row === i && cell.col === j);
        
        if (mergedCell && i === mergedCell.rowStart && j === mergedCell.colStart) {
          // This is the start of a merged cell
          const rowSpan = mergedCell.rowEnd - mergedCell.rowStart;
          const colSpan = mergedCell.colEnd - mergedCell.colStart;
          html += `    <td style="border: ${borderStyle}; padding: ${config.cellPadding}px; background-color: ${config.cellBackgroundColor}; border-radius: ${config.borderRadius}px;" rowspan="${rowSpan}" colspan="${colSpan}">${mergedCell.content}</td>\n`;
        } else if (!isCellMerged(i, j)) {
          // Regular cell
          const cellContent = config.fillSampleText ? `Cell ${i + 1}-${j + 1}` : '';
          const bgColor = isSelected ? '#dbeafe' : config.cellBackgroundColor;
          html += `    <td style="border: ${borderStyle}; padding: ${config.cellPadding}px; background-color: ${bgColor}; border-radius: ${config.borderRadius}px;">${cellContent}</td>\n`;
        }
        // Skip cells that are part of merged cells but not the start
      }
      html += '  </tr>\n';
    }
    html += '</table>';
    
    return html;
  }, [config, mergedCells, selectedCells]);

  // Generate CSS separately for better organization
  const generateCSS = useCallback(() => {
    const borderStyle = config.borderStyle === 'none' ? 'none' : `1px ${config.borderStyle} ${config.borderColor}`;
    
    return `table {
  border-collapse: collapse;
}

td {
  border: ${borderStyle};
  padding: ${config.cellPadding}px;
  background-color: ${config.cellBackgroundColor};
  border-radius: ${config.borderRadius}px;
}`;
  }, [config]);

  // Copy code to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Code copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  // Update config helper
  const updateConfig = (key: keyof TableConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  // Reset everything
  const resetTable = () => {
    setConfig({
      rows: 3,
      columns: 3,
      gap: 8,
      borderStyle: 'solid',
      borderColor: '#000000',
      cellPadding: 8,
      cellBackgroundColor: '#ffffff',
      borderRadius: 0,
      fillSampleText: false,
    });
    setMergedCells([]);
    setSelectedCells([]);
    setNextCellId(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">HTML Table Generator</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Create custom HTML tables with live preview and instant code generation. 
            Click cells to merge them, drag to reposition, resize to adjust size, and copy the generated code.
          </p>
        </header>

        {/* Instructions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">How to use HTML Table Generator?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-sm">1</div>
                <p className="text-gray-700">Customize the number of rows, columns, gap size, and styling options to fit your needs.</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-sm">2</div>
                <p className="text-gray-700">Click on cells to select them (they will turn blue when selected).</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-sm">3</div>
                <p className="text-gray-700">Select any 2 or more cells to create a merged cell. You can select cells in any pattern!</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-sm">4</div>
                <p className="text-gray-700">Drag merged cells using the handle in the bottom right corner to reposition them.</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-sm">5</div>
                <p className="text-gray-700">Resize merged cells by dragging the L-shaped handle to make them larger or smaller.</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-sm">6</div>
                <p className="text-gray-700">Copy the generated HTML and CSS code and paste it into your project.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Table Settings</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-6">
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-700 mb-2">Columns</label>
              <input
                type="number"
                min="1"
                max="20"
                value={config.columns}
                onChange={(e) => updateConfig('columns', parseInt(e.target.value) || 1)}
                className="w-full px-4 py-3 bg-gray-900 text-white border-0 rounded-lg text-center font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-700 mb-2">Rows</label>
              <input
                type="number"
                min="1"
                max="20"
                value={config.rows}
                onChange={(e) => updateConfig('rows', parseInt(e.target.value) || 1)}
                className="w-full px-4 py-3 bg-gray-900 text-white border-0 rounded-lg text-center font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-700 mb-2">Gap (px)</label>
              <input
                type="number"
                min="0"
                max="50"
                value={config.gap}
                onChange={(e) => updateConfig('gap', parseInt(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-gray-900 text-white border-0 rounded-lg text-center font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-700 mb-2">Padding (px)</label>
              <input
                type="number"
                min="0"
                max="50"
                value={config.cellPadding}
                onChange={(e) => updateConfig('cellPadding', parseInt(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-gray-900 text-white border-0 rounded-lg text-center font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-700 mb-2">Border Style</label>
              <select
                value={config.borderStyle}
                onChange={(e) => updateConfig('borderStyle', e.target.value as 'solid' | 'dashed' | 'none')}
                className="w-full px-4 py-3 bg-gray-900 text-white border-0 rounded-lg text-center font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="none">None</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-700 mb-2">Border Color</label>
              <input
                type="color"
                value={config.borderColor}
                onChange={(e) => updateConfig('borderColor', e.target.value)}
                className="w-full h-12 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-700 mb-2">Cell Color</label>
              <input
                type="color"
                value={config.cellBackgroundColor}
                onChange={(e) => updateConfig('cellBackgroundColor', e.target.value)}
                className="w-full h-12 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-700 mb-2">Border Radius (px)</label>
              <input
                type="number"
                min="0"
                max="50"
                value={config.borderRadius}
                onChange={(e) => updateConfig('borderRadius', parseInt(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-gray-900 text-white border-0 rounded-lg text-center font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  id="fillSampleText"
                  checked={config.fillSampleText}
                  onChange={(e) => updateConfig('fillSampleText', e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-semibold text-gray-700">Sample Text</span>
              </label>
            </div>
          </div>
        </div>

        {/* Table Preview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Table Preview</h2>
            <button
              onClick={resetTable}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Reset Table
            </button>
          </div>
          <div 
            ref={tableRef}
            className="border-2 border-gray-200 rounded-xl p-8 bg-white overflow-auto flex justify-center relative"
          >
            <div className="inline-block">
              <div 
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${config.columns}, 1fr)`,
                  gridTemplateRows: `repeat(${config.rows}, 1fr)`,
                  gap: `${config.gap}px`,
                  width: `${config.columns * 80 + (config.columns - 1) * config.gap}px`,
                  height: `${config.rows * 50 + (config.rows - 1) * config.gap}px`,
                }}
              >
                {Array.from({ length: config.rows }, (_, i) =>
                  Array.from({ length: config.columns }, (_, j) => {
                    const mergedCell = getMergedCell(i, j);
                    const isSelected = selectedCells.some(cell => cell.row === i && cell.col === j);
                    const isBeingDragged = dragState.isDragging && dragState.cellId === mergedCell?.id;
                    const isBeingResized = dragState.isResizing && dragState.cellId === mergedCell?.id;
                    
                    if (mergedCell && i === mergedCell.rowStart && j === mergedCell.colStart) {
                      // This is the start of a merged cell
                      const rowSpan = mergedCell.rowEnd - mergedCell.rowStart;
                      const colSpan = mergedCell.colEnd - mergedCell.colStart;
                      const borderStyle = config.borderStyle === 'none' ? 'none' : `2px ${config.borderStyle} ${config.borderColor}`;
                      
                      return (
                        <div
                          key={`${i}-${j}`}
                          style={{
                            gridRow: `${i + 1} / span ${rowSpan}`,
                            gridColumn: `${j + 1} / span ${colSpan}`,
                            border: borderStyle,
                            padding: `${config.cellPadding}px`,
                            backgroundColor: config.cellBackgroundColor,
                            cursor: isBeingDragged ? 'grabbing' : 'pointer',
                            position: 'relative',
                            borderRadius: `${config.borderRadius}px`,
                            opacity: (isBeingDragged || isBeingResized) ? 0.5 : 1,
                            transform: (isBeingDragged || isBeingResized) ? 'scale(0.95)' : 'scale(1)',
                            transition: 'all 0.2s ease',
                            zIndex: (isBeingDragged || isBeingResized) ? 10 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          onClick={() => handleCellClick(i, j)}
                          className={`hover:bg-gray-50 transition-all duration-200 ${(isBeingDragged || isBeingResized) ? 'shadow-lg' : ''}`}
                        >
                          <div className="text-center font-medium text-gray-700">{mergedCell.content}</div>
                          <div className="absolute top-0 right-0 w-0 h-0 border-l-[16px] border-l-transparent border-t-[16px] border-t-pink-500">
                            <span className="absolute -top-3 -right-1 text-white text-sm font-bold">×</span>
                          </div>
                          <div 
                            className={`absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-gray-800 rounded-sm transition-all duration-200 ${
                              isBeingDragged 
                                ? 'cursor-grabbing bg-gray-300 scale-110' 
                                : isBeingResized
                                ? 'cursor-nw-resize bg-gray-400 scale-125'
                                : 'cursor-grab hover:bg-gray-200 hover:scale-105'
                            }`}
                            onMouseDown={(e) => {
                              if (e.shiftKey) {
                                handleResizeStart(e, mergedCell.id);
                              } else {
                                handleDragStart(e, mergedCell.id);
                              }
                            }}
                            title="Drag to move, Shift+Drag to resize"
                          ></div>
                        </div>
                      );
                    } else if (!isCellMerged(i, j)) {
                      // Regular cell
                      const borderStyle = config.borderStyle === 'none' ? 'none' : `2px ${config.borderStyle} ${config.borderColor}`;
                      const bgColor = isSelected ? '#dbeafe' : config.cellBackgroundColor;
                      const cellContent = config.fillSampleText ? `Cell ${i + 1}-${j + 1}` : '';
                      
                      return (
                        <div
                          key={`${i}-${j}`}
                          style={{
                            border: borderStyle,
                            padding: `${config.cellPadding}px`,
                            backgroundColor: bgColor,
                            cursor: 'pointer',
                            borderRadius: `${config.borderRadius}px`,
                            minWidth: '60px',
                            minHeight: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          onClick={() => handleCellClick(i, j)}
                          className="hover:bg-gray-50 transition-all duration-200 hover:scale-[1.02]"
                        >
                          <div className="text-center font-medium text-gray-700">{cellContent}</div>
                        </div>
                      );
                    }
                    return null; // Skip cells that are part of merged cells but not the start
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Code Output */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* HTML Code */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">HTML Code</h3>
              <button
                onClick={() => copyToClipboard(generateTableHTML())}
                className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                Copy HTML
              </button>
            </div>
            <pre className="bg-gray-50 p-6 rounded-lg overflow-x-auto text-sm text-gray-800 border border-gray-200">
              <code>{generateTableHTML()}</code>
            </pre>
          </div>

          {/* CSS Code */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">CSS Code</h3>
              <button
                onClick={() => copyToClipboard(generateCSS())}
                className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                Copy CSS
              </button>
            </div>
            <pre className="bg-gray-50 p-6 rounded-lg overflow-x-auto text-sm text-gray-800 border border-gray-200">
              <code>{generateCSS()}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
