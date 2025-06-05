import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Attendance, Contribution, Event, Member } from '../types';

/**
 * Exports data as CSV
 */
export const exportToCSV = <T extends Record<string, any>>(
  data: T[],
  filename: string,
  headers: { key: keyof T; label: string }[]
): void => {
  // Create CSV content
  const headerRow = headers.map((header) => `"${header.label}"`).join(',');
  const rows = data.map((item) => {
    return headers
      .map((header) => {
        const value = item[header.key];
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : `"${value}"`;
      })
      .join(',');
  });

  const csvContent = [headerRow, ...rows].join('\n');
  
  // Create a Blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Exports attendance data to PDF
 */
export const exportAttendanceToPDF = (
  attendanceData: { 
    member: Member; 
    event: Event; 
    attendance: Attendance;
  }[],
  title: string
): void => {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  
  // Add date
  doc.setFontSize(11);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
  
  // Create table
  const tableColumn = [
    'Name', 
    'Jersey #', 
    'Position', 
    'Event', 
    'Date', 
    'Status'
  ];
  
  const tableRows = attendanceData.map(({ member, event, attendance }) => [
    member.name,
    member.jerseyNumber.toString(),
    member.position,
    event.type === 'training' ? 'Training' : `Friendly vs ${event.opponent}`,
    new Date(event.date).toLocaleDateString(),
    attendance.status
  ]);

  (doc as any).autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 40,
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [63, 81, 181], textColor: [255, 255, 255] }
  });
  
  // Save PDF
  doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
};

/**
 * Exports contributions data to PDF
 */
export const exportContributionsToPDF = (
  contributionsData: { 
    member: Member; 
    contribution: Contribution;
    event?: Event;
  }[],
  title: string
): void => {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  
  // Add date
  doc.setFontSize(11);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
  
  // Create table
  const tableColumn = [
    'Name', 
    'Type', 
    'Amount/Description', 
    'Date', 
    'Payment Method',
    'Related Event'
  ];
  
  const tableRows = contributionsData.map(({ member, contribution, event }) => [
    member.name,
    contribution.type === 'monetary' ? 'Money' : 'In-Kind',
    contribution.type === 'monetary' ? `$${contribution.amount}` : contribution.description,
    new Date(contribution.date).toLocaleDateString(),
    contribution.paymentMethod || 'N/A',
    event ? `${event.type === 'training' ? 'Training' : `Friendly vs ${event.opponent}`} (${new Date(event.date).toLocaleDateString()})` : 'N/A'
  ]);

  (doc as any).autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 40,
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [63, 81, 181], textColor: [255, 255, 255] }
  });
  
  // Save PDF
  doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
};