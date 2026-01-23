
import React from 'react';

// Declare global from script tag
declare var html2canvas: any;

export const exportToExcel = (data: any[], fileName: string) => {
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
        + data.map(row => Object.values(row).map(val => `"${val}"`).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${fileName}.csv`); // Using CSV as a simple Excel compatible format
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const exportToImage = async (containerRef: React.RefObject<HTMLDivElement>, fileName: string) => {
    if (!containerRef.current) return;
    
    try {
        const canvas = await html2canvas(containerRef.current, {
            backgroundColor: window.getComputedStyle(document.body).backgroundColor,
            scale: 2, // Higher resolution
            logging: false,
            useCORS: true
        });
        
        const image = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = image;
        link.download = `${fileName}.png`;
        link.click();
    } catch (err) {
        console.error("Export to image failed:", err);
    }
};

export const extractTableData = (tableContainerRef: React.RefObject<HTMLDivElement>) => {
    if (!tableContainerRef.current) return [];
    const table = tableContainerRef.current.querySelector('table');
    if (!table) return [];

    const data: any[] = [];
    const rows = table.querySelectorAll('tr');
    
    rows.forEach(row => {
        const rowData: any = {};
        const cells = row.querySelectorAll('th, td');
        cells.forEach((cell, i) => {
            rowData[`col_${i}`] = cell.textContent?.trim() || "";
        });
        data.push(rowData);
    });
    
    return data;
};
