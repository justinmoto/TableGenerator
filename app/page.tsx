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
  columnWidths: number[]; // New: individual column widths
  rowHeights: number[];   // New: individual row heights
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
  isResizingColumn: boolean;
  isResizingRow: boolean;
  isResizingIndividualCell: boolean;
  resizingColumnIndex: number | null;
  resizingRowIndex: number | null;
  resizingCellRow: number | null;
  resizingCellCol: number | null;
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
    columnWidths: Array(3).fill(80), // Default column width
    rowHeights: Array(3).fill(50),   // Default row height
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
    isResizingColumn: false,
    isResizingRow: false,
    isResizingIndividualCell: false,
    resizingColumnIndex: null,
    resizingRowIndex: null,
    resizingCellRow: null,
    resizingCellCol: null,
  });

  const tableRef = useRef<HTMLDivElement>(null);
  const dragPreviewRef = useRef<HTMLDivElement>(null);
  const lastDragUpdate = useRef(0);

  // Update column and row arrays when table size changes
  useEffect(() => {
    setConfig(prev => ({
      ...prev,
      columnWidths: Array(prev.columns).fill(80),
      rowHeights: Array(prev.rows).fill(50),
    }));
  }, [config.columns, config.rows]);

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
    if (dragState.isDragging || dragState.isResizing || dragState.isResizingColumn || dragState.isResizingRow) return;
    
    // If clicking on a merged cell, remove it
    if (isCellMerged(row, col)) {
      setMergedCells(prev => prev.filter(cell => 
        !(row >= cell.rowStart && row < cell.rowEnd && 
          col >= cell.colStart && col < cell.colEnd)
      ));
      setSelectedCells([]);
      return;
    }
    
    // Check if cell is already selected
    const isSelected = selectedCells.some(cell => cell.row === row && cell.col === col);
    
    if (isSelected) {
      // Remove from selection
      setSelectedCells(prev => prev.filter(cell => !(cell.row === row && cell.col === col)));
    } else {
      // Add to selection
      const newSelection = [...selectedCells, { row, col }];
      setSelectedCells(newSelection);
      
      console.log(`Selected ${newSelection.length} cells:`, newSelection);
      
      // If we have 2 or more cells selected, create merged cell
      if (newSelection.length >= 2) {
        // Add a small delay to make merging more reliable
        setTimeout(() => {
          const minRow = Math.min(...newSelection.map(c => c.row));
          const maxRow = Math.max(...newSelection.map(c => c.row));
          const minCol = Math.min(...newSelection.map(c => c.col));
          const maxCol = Math.max(...newSelection.map(c => c.col));
          
          const newMergedCell: MergedCell = {
            id: nextCellId,
            rowStart: minRow,
            rowEnd: maxRow + 1,
            colStart: minCol,
            colEnd: maxCol + 1,
            content: config.fillSampleText ? `Merged ${nextCellId}` : ''
          };
          
          setMergedCells(prev => [...prev, newMergedCell]);
          setNextCellId(prev => prev + 1);
          setSelectedCells([]);
        }, 100);
      }
    }
  };

  // Handle column resize start
  const handleColumnResizeStart = (e: React.MouseEvent, columnIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragState(prev => ({
      ...prev,
      isResizingColumn: true,
      resizingColumnIndex: columnIndex,
      startX: e.clientX,
      currentX: e.clientX,
    }));

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  // Handle row resize start
  const handleRowResizeStart = (e: React.MouseEvent, rowIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragState(prev => ({
      ...prev,
      isResizingRow: true,
      resizingRowIndex: rowIndex,
      startY: e.clientY,
      currentY: e.clientY,
    }));

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  // Handle individual cell resize start
  const handleIndividualCellResizeStart = (e: React.MouseEvent, row: number, col: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragState(prev => ({
      ...prev,
      isResizingIndividualCell: true,
      resizingCellRow: row,
      resizingCellCol: col,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
    }));

    document.body.style.cursor = 'nw-resize';
    document.body.style.userSelect = 'none';
  };

  // Handle column resize move
  const handleColumnResizeMove = useCallback((e: MouseEvent) => {
    if (!dragState.isResizingColumn || dragState.resizingColumnIndex === null) return;

    const deltaX = e.clientX - dragState.startX;
    const newWidth = Math.max(40, config.columnWidths[dragState.resizingColumnIndex] + deltaX);
    
    setConfig(prev => ({
      ...prev,
      columnWidths: prev.columnWidths.map((width, index) => 
        index === dragState.resizingColumnIndex ? newWidth : width
      )
    }));
  }, [dragState.isResizingColumn, dragState.resizingColumnIndex, dragState.startX, config.columnWidths]);

  // Handle row resize move
  const handleRowResizeMove = useCallback((e: MouseEvent) => {
    if (!dragState.isResizingRow || dragState.resizingRowIndex === null) return;

    const deltaY = e.clientY - dragState.startY;
    const newHeight = Math.max(30, config.rowHeights[dragState.resizingRowIndex] + deltaY);
    
    setConfig(prev => ({
      ...prev,
      rowHeights: prev.rowHeights.map((height, index) => 
        index === dragState.resizingRowIndex ? newHeight : height
      )
    }));
  }, [dragState.isResizingRow, dragState.resizingRowIndex, dragState.startY, config.rowHeights]);

  // Handle drag start (for moving)
  const handleDragStart = (e: React.MouseEvent, cellId: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = e.currentTarget.getBoundingClientRect();
    setDragState(prev => ({
      ...prev,
      isDragging: true,
      isResizing: false,
      isResizingColumn: false,
      isResizingRow: false,
      cellId,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      currentX: e.clientX,
      currentY: e.clientY,
    }));

    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  };

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent, cellId: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragState(prev => ({
      ...prev,
      isDragging: false,
      isResizing: true,
      isResizingColumn: false,
      isResizingRow: false,
      cellId,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: 0,
      offsetY: 0,
      currentX: e.clientX,
      currentY: e.clientY,
    }));

    document.body.style.cursor = 'nw-resize';
    document.body.style.userSelect = 'none';
  };

  // Handle drag move
  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!dragState.isDragging || !dragState.cellId || !tableRef.current) return;

    // Add throttle to make dragging more controlled
    const now = Date.now();
    if (now - lastDragUpdate.current < 16) return; // Update every 16ms (60fps) for smoother movement
    lastDragUpdate.current = now;

    const tableRect = tableRef.current.getBoundingClientRect();
    
    // Calculate new position with better precision
    const deltaX = e.clientX - dragState.startX;
    const deltaY = e.clientY - dragState.startY;
    
    // Use more responsive sensitivity for better dragging experience
    const sensitivity = 1.0; // Increased for better responsiveness
    
    // Calculate movement in grid units based on average cell size
    const avgCellWidth = config.columnWidths.reduce((sum, width) => sum + width, 0) / config.columnWidths.length;
    const avgCellHeight = config.rowHeights.reduce((sum, height) => sum + height, 0) / config.rowHeights.length;
    
    const colDelta = Math.round((deltaX * sensitivity) / (avgCellWidth + config.gap));
    const rowDelta = Math.round((deltaY * sensitivity) / (avgCellHeight + config.gap));
    
    // Reduce the movement threshold for more responsive dragging
    if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return; // Reduced threshold for better responsiveness
    
    setMergedCells(prev => prev.map(cell => {
      if (cell.id === dragState.cellId) {
        const rowSpan = cell.rowEnd - cell.rowStart;
        const colSpan = cell.colEnd - cell.colStart;
        
        // Calculate new position with bounds checking
        const newColStart = Math.max(0, Math.min(
          cell.colStart + colDelta,
          config.columns - colSpan
        ));
        
        const newRowStart = Math.max(0, Math.min(
          cell.rowStart + rowDelta,
          config.rows - rowSpan
        ));
        
        // Only update if position actually changed
        if (newColStart === cell.colStart && newRowStart === cell.rowStart) return cell;
        
        return {
          ...cell,
          colStart: newColStart,
          colEnd: newColStart + colSpan,
          rowStart: newRowStart,
          rowEnd: newRowStart + rowSpan,
        };
      }
      return cell;
    }));
  }, [dragState.isDragging, dragState.cellId, dragState.startX, dragState.startY, config.rows, config.columns, config.gap, config.columnWidths, config.rowHeights]);

  // Handle resize move
  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!dragState.isResizing || !dragState.cellId || !tableRef.current) return;

    const tableRect = tableRef.current.getBoundingClientRect();
    
    // Calculate new size with better precision and control
    const deltaX = e.clientX - dragState.startX;
    const deltaY = e.clientY - dragState.startY;
    
    // Use much more responsive sensitivity for resizing
    const sensitivity = 1.2; // Increased significantly for better responsiveness
    
    // Calculate movement in grid units with better precision
    const avgCellWidth = config.columnWidths.reduce((sum, width) => sum + width, 0) / config.columnWidths.length;
    const avgCellHeight = config.rowHeights.reduce((sum, height) => sum + height, 0) / config.rowHeights.length;
    
    // Make horizontal resizing more responsive
    const colDelta = Math.round((deltaX * sensitivity) / (avgCellWidth + config.gap));
    const rowDelta = Math.round((deltaY * sensitivity) / (avgCellHeight + config.gap));
    
    // Reduce threshold for more responsive resizing
    if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) return; // Reduced threshold
    
    setMergedCells(prev => prev.map(cell => {
      if (cell.id === dragState.cellId) {
        const originalColSpan = cell.colEnd - cell.colStart;
        const originalRowSpan = cell.rowEnd - cell.rowStart;
        
        // Calculate new size with minimum constraints
        const newColEnd = Math.max(
          cell.colStart + 1, // Minimum 1 column
          Math.min(
            cell.colStart + originalColSpan + colDelta, // Add delta
            config.columns // Don't exceed table width
          )
        );
        
        const newRowEnd = Math.max(
          cell.rowStart + 1, // Minimum 1 row
          Math.min(
            cell.rowStart + originalRowSpan + rowDelta, // Add delta
            config.rows // Don't exceed table height
          )
        );
        
        // Only update if size actually changed
        if (newColEnd === cell.colEnd && newRowEnd === cell.rowEnd) return cell;
        
        return {
          ...cell,
          colEnd: newColEnd,
          rowEnd: newRowEnd,
        };
      }
      return cell;
    }));
  }, [dragState.isResizing, dragState.cellId, dragState.startX, dragState.startY, config.rows, config.columns, config.gap, config.columnWidths, config.rowHeights]);

  // Handle individual cell resize move
  const handleIndividualCellResizeMove = useCallback((e: MouseEvent) => {
    if (!dragState.isResizingIndividualCell || dragState.resizingCellRow === null || dragState.resizingCellCol === null) return;

    const deltaX = e.clientX - dragState.startX;
    const deltaY = e.clientY - dragState.startY;
    
    // Resize individual cell by adjusting column widths and row heights
    const colIndex = dragState.resizingCellCol;
    const rowIndex = dragState.resizingCellRow;
    
    // Calculate new dimensions
    const newColWidth = Math.max(40, config.columnWidths[colIndex] + deltaX);
    const newRowHeight = Math.max(30, config.rowHeights[rowIndex] + deltaY);
    
    setConfig(prev => ({
      ...prev,
      columnWidths: prev.columnWidths.map((width, index) => 
        index === colIndex ? newColWidth : width
      ),
      rowHeights: prev.rowHeights.map((height, index) => 
        index === rowIndex ? newRowHeight : height
      )
    }));
  }, [dragState.isResizingIndividualCell, dragState.resizingCellRow, dragState.resizingCellCol, dragState.startX, dragState.startY, config.columnWidths, config.rowHeights]);

  // Handle drag/resize end
  const handleDragEnd = useCallback(() => {
    setDragState(prev => ({
      ...prev,
      isDragging: false,
      isResizing: false,
      isResizingColumn: false,
      isResizingRow: false,
      isResizingIndividualCell: false,
      cellId: null,
      startX: 0,
      startY: 0,
      offsetX: 0,
      offsetY: 0,
      currentX: 0,
      currentY: 0,
      resizingColumnIndex: null,
      resizingRowIndex: null,
      resizingCellRow: null,
      resizingCellCol: null,
    }));

    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  // Add/remove event listeners
  useEffect(() => {
    if (dragState.isDragging || dragState.isResizing || dragState.isResizingColumn || dragState.isResizingRow || dragState.isResizingIndividualCell) {
      let moveHandler: (e: MouseEvent) => void;
      
      if (dragState.isResizingColumn) {
        moveHandler = handleColumnResizeMove;
      } else if (dragState.isResizingRow) {
        moveHandler = handleRowResizeMove;
      } else if (dragState.isResizing) {
        moveHandler = handleResizeMove;
      } else if (dragState.isResizingIndividualCell) {
        moveHandler = handleIndividualCellResizeMove;
      } else {
        moveHandler = handleDragMove;
      }
      
      document.addEventListener('mousemove', moveHandler);
      document.addEventListener('mouseup', handleDragEnd);
      return () => {
        document.removeEventListener('mousemove', moveHandler);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [dragState.isDragging, dragState.isResizing, dragState.isResizingColumn, dragState.isResizingRow, dragState.isResizingIndividualCell, handleDragMove, handleResizeMove, handleColumnResizeMove, handleRowResizeMove, handleIndividualCellResizeMove, handleDragEnd]);

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
    
    let css = `table {
  border-collapse: collapse;
  width: 100%;
}

td {
  border: ${borderStyle};
  padding: ${config.cellPadding}px;
  background-color: ${config.cellBackgroundColor};
  border-radius: ${config.borderRadius}px;
}`;

    // Add column width styles
    config.columnWidths.forEach((width, index) => {
      css += `\n\ntd:nth-child(${index + 1}) {
  width: ${width}px;
}`;
    });

    // Add row height styles
    config.rowHeights.forEach((height, index) => {
      css += `\n\ntr:nth-child(${index + 1}) td {
  height: ${height}px;
}`;
    });
    
    return css;
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
      columnWidths: Array(3).fill(80),
      rowHeights: Array(3).fill(50),
    });
    setMergedCells([]);
    setSelectedCells([]);
    setNextCellId(1);
  };

  // Calculate total table dimensions
  const totalWidth = config.columnWidths.reduce((sum, width) => sum + width, 0) + (config.columns - 1) * config.gap;
  const totalHeight = config.rowHeights.reduce((sum, height) => sum + height, 0) + (config.rows - 1) * config.gap;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">HTML Table Generator</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Create custom HTML tables with live preview and instant code generation. 
            Merge multiple cells, resize columns and rows individually, and copy the generated code.
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
                <p className="text-gray-700">Click on cells to select them (they turn blue). Select 2 or more cells to automatically merge them.</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-sm">3</div>
                <p className="text-gray-700">Drag column borders to resize individual columns, or row borders to resize rows.</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-sm">4</div>
                <p className="text-gray-700"><strong>Drag merged cells:</strong> Use the blue handle in the bottom-right corner to move merged cells left/right and up/down.</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-sm">5</div>
                <p className="text-gray-700"><strong>Resize merged cells:</strong> Hold Shift and drag the handle to make cells larger or smaller.</p>
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
          
                  {/* Instructions */}
        <div className="mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm">
              <strong>How to merge cells:</strong> Click on cells to select them (they turn blue). 
              You can select as many cells as you want - 3, 4, 5, or more! 
              When you select 2 or more cells, they will automatically merge into one big cell. 
              Click on a merged cell to remove it.
            </p>
          </div>
        </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Basic Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Basic Settings</h3>
              
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
            </div>

            {/* Spacing Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Spacing</h3>
              
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
            </div>

            {/* Border Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Border & Style</h3>
              
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
            </div>

            {/* Color Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Colors</h3>
              
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
            </div>

            {/* Additional Options */}
            <div className="space-y-4 md:col-span-2 lg:col-span-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Additional Options</h3>
              
              <div className="flex items-center space-x-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    id="fillSampleText"
                    checked={config.fillSampleText}
                    onChange={(e) => updateConfig('fillSampleText', e.target.checked)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-semibold text-gray-700">Fill cells with sample text</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Table Preview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Table Preview</h2>
            <div className="flex space-x-4">
              <div className="text-sm text-gray-600">
                {selectedCells.length > 0 && (
                  <span className="text-blue-600 font-medium">
                    {selectedCells.length} cells selected - select more to merge!
                  </span>
                )}
              </div>
              {selectedCells.length >= 2 && (
                <button
                  onClick={() => {
                    const minRow = Math.min(...selectedCells.map(c => c.row));
                    const maxRow = Math.max(...selectedCells.map(c => c.row));
                    const minCol = Math.min(...selectedCells.map(c => c.col));
                    const maxCol = Math.max(...selectedCells.map(c => c.col));
                    
                    const newMergedCell: MergedCell = {
                      id: nextCellId,
                      rowStart: minRow,
                      rowEnd: maxRow + 1,
                      colStart: minCol,
                      colEnd: maxCol + 1,
                      content: config.fillSampleText ? `Merged ${nextCellId}` : ''
                    };
                    
                    setMergedCells(prev => [...prev, newMergedCell]);
                    setNextCellId(prev => prev + 1);
                    setSelectedCells([]);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Merge Selected Cells
                </button>
              )}
              <button
                onClick={resetTable}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Reset Table
              </button>
            </div>
          </div>
          
          {/* Drag Instructions */}
          {mergedCells.length > 0 && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-blue-800 text-sm">
                  <strong>Tip:</strong> 
                  <br />• <strong>Move cells:</strong> Drag the blue handle to move merged cells left/right and up/down
                  <br />• <strong>Resize cells:</strong> Hold Shift + drag to resize cells wider/narrower (left/right) and taller/shorter (up/down)
                </div>
              </div>
              
              {/* Mode Indicator */}
              <div className="mt-3 pt-3 border-t border-blue-200">
                <div className="flex items-center space-x-4 text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                    <span className="text-blue-700">Drag Mode: Move cells around</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    <span className="text-green-700">Resize Mode: Hold Shift + drag</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div 
            ref={tableRef}
            className="border-2 border-gray-200 rounded-xl p-8 bg-white overflow-auto flex justify-center relative"
          >
            <div className="inline-block">
              <div 
                style={{
                  display: 'grid',
                  gridTemplateColumns: config.columnWidths.map(width => `${width}px`).join(' '),
                  gridTemplateRows: config.rowHeights.map(height => `${height}px`).join(' '),
                  gap: `${config.gap}px`,
                  width: `${totalWidth}px`,
                  height: `${totalHeight}px`,
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
                              opacity: (isBeingDragged || isBeingResized) ? 0.9 : 1,
                              transform: (isBeingDragged || isBeingResized) ? 'scale(0.99)' : 'scale(1)',
                              transition: 'all 0.2s ease',
                              zIndex: (isBeingDragged || isBeingResized) ? 10 : 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: isBeingResized 
                                ? '0 0 0 3px rgba(34, 197, 94, 0.4), 0 4px 12px rgba(0, 0, 0, 0.15)' 
                                : isBeingDragged 
                                ? '0 0 0 3px rgba(59, 130, 246, 0.4), 0 4px 12px rgba(0, 0, 0, 0.15)'
                                : 'none',
                            }}
                          onClick={() => handleCellClick(i, j)}
                          className={`hover:bg-gray-50 transition-all duration-200 ${(isBeingDragged || isBeingResized) ? 'shadow-lg' : ''}`}
                        >
                          <div className="text-center font-medium text-gray-700">{mergedCell.content}</div>
                          <div 
                            className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 shadow-md"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMergedCells(prev => prev.filter(cell => cell.id !== mergedCell.id));
                            }}
                            title="Remove merged cell"
                          >
                            <span className="text-white text-sm font-bold">×</span>
                          </div>
                          <div 
                            className={`absolute bottom-2 right-2 w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg shadow-lg transition-all duration-200 cursor-grab active:cursor-grabbing ${
                              isBeingDragged 
                                ? 'scale-110 rotate-12 shadow-xl' 
                                : isBeingResized
                                ? 'scale-110 rotate-45 shadow-xl'
                                : 'hover:scale-105 hover:shadow-xl'
                            }`}
                            onMouseDown={(e) => {
                              if (e.shiftKey) {
                                handleResizeStart(e, mergedCell.id);
                              } else {
                                handleDragStart(e, mergedCell.id);
                              }
                            }}
                            title="Drag to move, Shift+Drag to resize (left/right for width, up/down for height)"
                          >
                            <div className="absolute inset-0 flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                              </svg>
                            </div>
                            {/* Resize mode indicator */}
                            <div className={`absolute -top-1 -left-1 w-3 h-3 rounded-full transition-all duration-200 ${
                              isBeingResized 
                                ? 'bg-green-400 scale-125 shadow-lg' 
                                : 'bg-green-500 opacity-0 hover:opacity-100'
                            }`}>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                </svg>
                              </div>
                            </div>
                          </div>
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
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                          }}
                          onClick={() => handleCellClick(i, j)}
                          className="hover:bg-gray-50 transition-all duration-200 hover:scale-[1.02]"
                        >
                          <div className="text-center font-medium text-gray-700">{cellContent}</div>
                          
                          {/* Individual cell resize handle */}
                          <div 
                            className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 rounded-sm cursor-se-resize opacity-0 hover:opacity-100 transition-opacity"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              handleIndividualCellResizeStart(e, i, j);
                            }}
                            title="Drag to resize this cell"
                          ></div>
                        </div>
                      );
                    }
                    return null; // Skip cells that are part of merged cells but not the start
                  })
                )}
              </div>
              
              {/* Column resize handles */}
              {Array.from({ length: config.columns - 1 }, (_, i) => (
                <div
                  key={`col-resize-${i}`}
                  className="absolute w-2 h-full bg-transparent hover:bg-blue-200 cursor-col-resize transition-colors"
                  style={{
                    left: `${config.columnWidths.slice(0, i + 1).reduce((sum, width) => sum + width, 0) + (i + 1) * config.gap + 32 - 1}px`,
                    top: '32px',
                  }}
                  onMouseDown={(e) => handleColumnResizeStart(e, i + 1)}
                  title="Drag to resize column"
                />
              ))}
              
              {/* Row resize handles */}
              {Array.from({ length: config.rows - 1 }, (_, i) => (
                <div
                  key={`row-resize-${i}`}
                  className="absolute h-2 w-full bg-transparent hover:bg-blue-200 cursor-row-resize transition-colors"
                  style={{
                    top: `${config.rowHeights.slice(0, i + 1).reduce((sum, height) => sum + height, 0) + (i + 1) * config.gap + 32 - 1}px`,
                    left: '32px',
                  }}
                  onMouseDown={(e) => handleRowResizeStart(e, i + 1)}
                  title="Drag to resize row"
                />
              ))}
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
