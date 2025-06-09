import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Attendance, Contribution, Event, Member, Expense, Leadership } from '../types';
import { formatDate } from './date-utils';
import { formatUGX } from './currency-utils';

// PDF styling constants
const COLORS = {
  primary: '#4f4fe6',
  yellow: '#eab308',
  secondary: '#f43f4e',
  green: '#22c55e',
  red: '#ef4444',
  gray: '#6b7280',
  darkGray: '#374151',
  lightGray: '#f3f4f6',
};

const FONTS = {
  title: 18,
  subtitle: 14,
  heading: 12,
  body: 10,
  small: 8,
};

// Base64 encoded Fitholics logo (you'll need to replace this with actual logo)
const FITHOLICS_LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

/**
 * Base PDF export class with common functionality
 */
class BasePDFExporter {
  protected doc: jsPDF;
  protected pageWidth: number;
  protected pageHeight: number;
  protected margin: number = 20;
  protected currentY: number = 20;

  constructor(orientation: 'portrait' | 'landscape' = 'portrait') {
    this.doc = new jsPDF(orientation, 'mm', 'a4');
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  /**
   * Add header with logo and title
   */
  protected addHeader(title: string, subtitle?: string): void {
    // Add logo (placeholder - replace with actual logo)
    try {
      this.doc.addImage(FITHOLICS_LOGO, 'PNG', this.margin, this.margin, 20, 20);
    } catch (error) {
      console.warn('Logo not available, skipping');
    }

    // Add title
    this.doc.setFontSize(FONTS.title);
    this.doc.setTextColor(COLORS.primary);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('FITHOLICS FC', this.margin + 25, this.margin + 8);

    this.doc.setFontSize(FONTS.subtitle);
    this.doc.setTextColor(COLORS.darkGray);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Team Management Portal', this.margin + 25, this.margin + 15);

    // Add report title
    this.doc.setFontSize(FONTS.title);
    this.doc.setTextColor(COLORS.darkGray);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin, this.margin + 35);

    if (subtitle) {
      this.doc.setFontSize(FONTS.body);
      this.doc.setTextColor(COLORS.gray);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(subtitle, this.margin, this.margin + 42);
    }

    this.currentY = this.margin + 50;
  }

  /**
   * Add footer with page numbers and generation info
   */
  protected addFooter(): void {
    const pageCount = this.doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      
      // Page number
      this.doc.setFontSize(FONTS.small);
      this.doc.setTextColor(COLORS.gray);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(
        `Page ${i} of ${pageCount}`,
        this.pageWidth - this.margin,
        this.pageHeight - 10,
        { align: 'right' }
      );

      // Generation info
      this.doc.text(
        `Generated on ${formatDate(new Date().toISOString(), 'MMM d, yyyy')} at ${new Date().toLocaleTimeString()}`,
        this.margin,
        this.pageHeight - 10
      );

      // Footer line
      this.doc.setDrawColor(COLORS.lightGray);
      this.doc.line(this.margin, this.pageHeight - 15, this.pageWidth - this.margin, this.pageHeight - 15);
    }
  }

  /**
   * Add a section with statistics
   */
  protected addStatsSection(stats: { label: string; value: string; color?: string }[]): void {
    const boxWidth = (this.pageWidth - this.margin * 2 - 10 * (stats.length - 1)) / stats.length;
    const boxHeight = 25;

    stats.forEach((stat, index) => {
      const x = this.margin + index * (boxWidth + 10);
      
      // Draw box
      this.doc.setFillColor(stat.color || COLORS.lightGray);
      this.doc.rect(x, this.currentY, boxWidth, boxHeight, 'F');
      
      // Add border
      this.doc.setDrawColor(COLORS.gray);
      this.doc.rect(x, this.currentY, boxWidth, boxHeight);
      
      // Add label
      this.doc.setFontSize(FONTS.small);
      this.doc.setTextColor(COLORS.darkGray);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(stat.label, x + boxWidth / 2, this.currentY + 8, { align: 'center' });
      
      // Add value
      this.doc.setFontSize(FONTS.heading);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(stat.value, x + boxWidth / 2, this.currentY + 18, { align: 'center' });
    });

    this.currentY += boxHeight + 15;
  }

  /**
   * Check if we need a new page
   */
  protected checkPageBreak(requiredHeight: number = 30): void {
    if (this.currentY + requiredHeight > this.pageHeight - 30) {
      this.doc.addPage();
      this.currentY = this.margin;
    }
  }

  /**
   * Save the PDF
   */
  protected save(filename: string): void {
    this.addFooter();
    this.doc.save(`${filename}.pdf`);
  }
}

/**
 * Dashboard PDF Export
 */
export class DashboardPDFExporter extends BasePDFExporter {
  exportDashboard(data: {
    stats: {
      totalMembers: number;
      activeMembers: number;
      trainingSessionsThisMonth: number;
      friendliesThisMonth: number;
      totalContributions: number;
      totalExpenses: number;
      remainingBalance: number;
    };
    upcomingEvents: Event[];
    recentTransactions: any[];
  }): void {
    this.addHeader('Dashboard Overview', `Generated on ${formatDate(new Date().toISOString())}`);

    // Add statistics
    this.addStatsSection([
      { label: 'Active Members', value: data.stats.activeMembers.toString(), color: '#dbeafe' },
      { label: 'Training Sessions', value: data.stats.trainingSessionsThisMonth.toString(), color: '#dcfce7' },
      { label: 'Friendly Matches', value: data.stats.friendliesThisMonth.toString(), color: '#fef3c7' },
      { label: 'Total Contributions', value: formatUGX(data.stats.totalContributions), color: '#d1fae5' },
    ]);

    // Financial Summary
    this.checkPageBreak(40);
    this.doc.setFontSize(FONTS.subtitle);
    this.doc.setTextColor(COLORS.darkGray);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Financial Summary', this.margin, this.currentY);
    this.currentY += 10;

    const balanceColor = data.stats.remainingBalance >= 0 ? COLORS.green : COLORS.red;
    this.doc.setFontSize(FONTS.body);
    this.doc.setTextColor(COLORS.gray);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Total Contributions: ${formatUGX(data.stats.totalContributions)}`, this.margin, this.currentY);
    this.currentY += 6;
    this.doc.text(`Total Expenses: ${formatUGX(data.stats.totalExpenses)}`, this.margin, this.currentY);
    this.currentY += 6;
    this.doc.setTextColor(balanceColor);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`${data.stats.remainingBalance >= 0 ? 'Available Balance' : 'Deficit'}: ${formatUGX(Math.abs(data.stats.remainingBalance))}`, this.margin, this.currentY);
    this.currentY += 15;

    // Upcoming Events
    if (data.upcomingEvents.length > 0) {
      this.checkPageBreak(60);
      this.doc.setFontSize(FONTS.subtitle);
      this.doc.setTextColor(COLORS.darkGray);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Upcoming Events', this.margin, this.currentY);
      this.currentY += 10;

      const eventColumns = [
        { header: 'Date', dataKey: 'date' },
        { header: 'Type', dataKey: 'type' },
        { header: 'Description', dataKey: 'description' },
        { header: 'Location', dataKey: 'location' },
      ];

      const eventRows = data.upcomingEvents.slice(0, 5).map(event => ({
        date: formatDate(event.date),
        type: event.type === 'training' ? 'Training' : `Friendly vs ${event.opponent}`,
        description: event.description || 'No description',
        location: event.location,
      }));

      (this.doc as any).autoTable({
        head: [eventColumns.map(col => col.header)],
        body: eventRows.map(row => eventColumns.map(col => row[col.dataKey as keyof typeof row])),
        startY: this.currentY,
        styles: { fontSize: FONTS.body, cellPadding: 3 },
        headStyles: { fillColor: COLORS.primary, textColor: '#ffffff' },
        alternateRowStyles: { fillColor: COLORS.lightGray },
      });

      this.currentY = (this.doc as any).lastAutoTable.finalY + 15;
    }

    // Recent Transactions
    if (data.recentTransactions.length > 0) {
      this.checkPageBreak(60);
      this.doc.setFontSize(FONTS.subtitle);
      this.doc.setTextColor(COLORS.darkGray);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Recent Transactions', this.margin, this.currentY);
      this.currentY += 10;

      const transactionColumns = [
        { header: 'Date', dataKey: 'date' },
        { header: 'Type', dataKey: 'type' },
        { header: 'Description', dataKey: 'description' },
        { header: 'Amount', dataKey: 'amount' },
      ];

      const transactionRows = data.recentTransactions.slice(0, 10).map(transaction => ({
        date: formatDate(transaction.date),
        type: transaction.type,
        description: transaction.description,
        amount: `${transaction.type === 'contribution' ? '+' : '-'}${formatUGX(transaction.amount)}`,
      }));

      (this.doc as any).autoTable({
        head: [transactionColumns.map(col => col.header)],
        body: transactionRows.map(row => transactionColumns.map(col => row[col.dataKey as keyof typeof row])),
        startY: this.currentY,
        styles: { fontSize: FONTS.body, cellPadding: 3 },
        headStyles: { fillColor: COLORS.primary, textColor: '#ffffff' },
        alternateRowStyles: { fillColor: COLORS.lightGray },
      });
    }

    this.save('fitholics-fc-dashboard');
  }
}

/**
 * Members PDF Export
 */
export class MembersPDFExporter extends BasePDFExporter {
  exportMembers(members: Member[]): void {
    this.addHeader('Team Members', `Total: ${members.length} members`);

    // Add statistics
    const activeMembers = members.filter(m => m.status === 'active').length;
    const inactiveMembers = members.filter(m => m.status === 'inactive').length;
    const injuredMembers = members.filter(m => m.status === 'injured').length;

    this.addStatsSection([
      { label: 'Total Members', value: members.length.toString(), color: '#dbeafe' },
      { label: 'Active', value: activeMembers.toString(), color: '#d1fae5' },
      { label: 'Inactive', value: inactiveMembers.toString(), color: '#fef3c7' },
      { label: 'Injured', value: injuredMembers.toString(), color: '#fee2e2' },
    ]);

    // Members table
    const columns = [
      { header: 'Jersey #', dataKey: 'jerseyNumber' },
      { header: 'Name', dataKey: 'name' },
      { header: 'Position', dataKey: 'position' },
      { header: 'Status', dataKey: 'status' },
      { header: 'Email', dataKey: 'email' },
      { header: 'Phone', dataKey: 'phone' },
      { header: 'Date Joined', dataKey: 'dateJoined' },
    ];

    const rows = members
      .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
      .map(member => ({
        jerseyNumber: member.jerseyNumber.toString(),
        name: member.name,
        position: member.position,
        status: member.status.charAt(0).toUpperCase() + member.status.slice(1),
        email: member.email,
        phone: member.phone,
        dateJoined: formatDate(member.dateJoined),
      }));

    (this.doc as any).autoTable({
      head: [columns.map(col => col.header)],
      body: rows.map(row => columns.map(col => row[col.dataKey as keyof typeof row])),
      startY: this.currentY,
      styles: { fontSize: FONTS.body, cellPadding: 3 },
      headStyles: { fillColor: COLORS.primary, textColor: '#ffffff' },
      alternateRowStyles: { fillColor: COLORS.lightGray },
      columnStyles: {
        0: { halign: 'center', cellWidth: 20 },
        3: { halign: 'center' },
      },
    });

    this.save('fitholics-fc-members');
  }
}

/**
 * Contributions & Expenses PDF Export
 */
export class ContributionsPDFExporter extends BasePDFExporter {
  exportContributions(data: {
    contributions: Contribution[];
    expenses: Expense[];
    members: Member[];
    totalContributions: number;
    totalExpenses: number;
    remainingBalance: number;
  }): void {
    this.addHeader('Contributions & Expenses', `Financial Report - ${formatDate(new Date().toISOString())}`);

    // Financial summary
    this.addStatsSection([
      { label: 'Total Contributions', value: formatUGX(data.totalContributions), color: '#d1fae5' },
      { label: 'Total Expenses', value: formatUGX(data.totalExpenses), color: '#fee2e2' },
      { label: data.remainingBalance >= 0 ? 'Available Balance' : 'Deficit', value: formatUGX(Math.abs(data.remainingBalance)), color: data.remainingBalance >= 0 ? '#dbeafe' : '#fef3c7' },
    ]);

    // Contributions section
    if (data.contributions.length > 0) {
      this.checkPageBreak(60);
      this.doc.setFontSize(FONTS.subtitle);
      this.doc.setTextColor(COLORS.darkGray);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Contributions', this.margin, this.currentY);
      this.currentY += 10;

      const contributionColumns = [
        { header: 'Date', dataKey: 'date' },
        { header: 'Member', dataKey: 'member' },
        { header: 'Type', dataKey: 'type' },
        { header: 'Amount', dataKey: 'amount' },
        { header: 'Description', dataKey: 'description' },
        { header: 'Payment Method', dataKey: 'paymentMethod' },
      ];

      const contributionRows = data.contributions.map(contribution => {
        const member = data.members.find(m => m.id === contribution.memberId);
        return {
          date: formatDate(contribution.date),
          member: member ? member.name : 'Unknown',
          type: contribution.type.charAt(0).toUpperCase() + contribution.type.slice(1),
          amount: contribution.amount ? formatUGX(contribution.amount) : 'N/A',
          description: contribution.description,
          paymentMethod: contribution.paymentMethod || 'N/A',
        };
      });

      (this.doc as any).autoTable({
        head: [contributionColumns.map(col => col.header)],
        body: contributionRows.map(row => contributionColumns.map(col => row[col.dataKey as keyof typeof row])),
        startY: this.currentY,
        styles: { fontSize: FONTS.body, cellPadding: 3 },
        headStyles: { fillColor: COLORS.green, textColor: '#ffffff' },
        alternateRowStyles: { fillColor: COLORS.lightGray },
      });

      this.currentY = (this.doc as any).lastAutoTable.finalY + 15;
    }

    // Expenses section
    if (data.expenses.length > 0) {
      this.checkPageBreak(60);
      this.doc.setFontSize(FONTS.subtitle);
      this.doc.setTextColor(COLORS.darkGray);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Expenses', this.margin, this.currentY);
      this.currentY += 10;

      const expenseColumns = [
        { header: 'Date', dataKey: 'date' },
        { header: 'Category', dataKey: 'category' },
        { header: 'Amount', dataKey: 'amount' },
        { header: 'Description', dataKey: 'description' },
        { header: 'Payment Method', dataKey: 'paymentMethod' },
      ];

      const expenseRows = data.expenses.map(expense => ({
        date: formatDate(expense.date),
        category: expense.category.charAt(0).toUpperCase() + expense.category.slice(1),
        amount: formatUGX(expense.amount),
        description: expense.description,
        paymentMethod: expense.paymentMethod || 'N/A',
      }));

      (this.doc as any).autoTable({
        head: [expenseColumns.map(col => col.header)],
        body: expenseRows.map(row => expenseColumns.map(col => row[col.dataKey as keyof typeof row])),
        startY: this.currentY,
        styles: { fontSize: FONTS.body, cellPadding: 3 },
        headStyles: { fillColor: COLORS.red, textColor: '#ffffff' },
        alternateRowStyles: { fillColor: COLORS.lightGray },
      });
    }

    this.save('fitholics-fc-contributions-expenses');
  }
}

/**
 * Events PDF Export
 */
export class EventsPDFExporter extends BasePDFExporter {
  exportEvents(events: Event[], type: 'training' | 'friendly' | 'all' = 'all'): void {
    const filteredEvents = type === 'all' ? events : events.filter(e => e.type === type);
    const title = type === 'all' ? 'All Events' : type === 'training' ? 'Training Sessions' : 'Friendly Matches';
    
    this.addHeader(title, `Total: ${filteredEvents.length} events`);

    // Add statistics
    const upcomingEvents = filteredEvents.filter(e => new Date(e.date) > new Date()).length;
    const pastEvents = filteredEvents.filter(e => new Date(e.date) <= new Date()).length;
    const trainingCount = filteredEvents.filter(e => e.type === 'training').length;
    const friendlyCount = filteredEvents.filter(e => e.type === 'friendly').length;

    this.addStatsSection([
      { label: 'Total Events', value: filteredEvents.length.toString(), color: '#dbeafe' },
      { label: 'Upcoming', value: upcomingEvents.toString(), color: '#d1fae5' },
      { label: 'Past', value: pastEvents.toString(), color: '#fef3c7' },
      ...(type === 'all' ? [
        { label: 'Training', value: trainingCount.toString(), color: '#e0e7ff' },
        { label: 'Friendlies', value: friendlyCount.toString(), color: '#fce7f3' },
      ] : []),
    ]);

    // Events table
    const columns = [
      { header: 'Date', dataKey: 'date' },
      { header: 'Time', dataKey: 'time' },
      { header: 'Type', dataKey: 'type' },
      { header: 'Description/Opponent', dataKey: 'description' },
      { header: 'Location', dataKey: 'location' },
      { header: 'Status', dataKey: 'status' },
    ];

    const rows = filteredEvents
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(event => ({
        date: formatDate(event.date),
        time: event.time,
        type: event.type === 'training' ? 'Training' : 'Friendly',
        description: event.type === 'training' ? (event.description || 'Training Session') : `vs ${event.opponent}`,
        location: event.location,
        status: new Date(event.date) > new Date() ? 'Upcoming' : 'Past',
      }));

    (this.doc as any).autoTable({
      head: [columns.map(col => col.header)],
      body: rows.map(row => columns.map(col => row[col.dataKey as keyof typeof row])),
      startY: this.currentY,
      styles: { fontSize: FONTS.body, cellPadding: 3 },
      headStyles: { fillColor: COLORS.primary, textColor: '#ffffff' },
      alternateRowStyles: { fillColor: COLORS.lightGray },
    });

    this.save(`fitholics-fc-${type === 'all' ? 'events' : type}`);
  }
}

/**
 * Attendance PDF Export
 */
export class AttendancePDFExporter extends BasePDFExporter {
  exportAttendance(data: {
    attendanceRecords: { member: Member; event: Event; attendance: Attendance }[];
    stats: {
      totalSessions: number;
      averageAttendance: number;
      highestAttendance: number;
      lowestAttendance: number;
    };
  }): void {
    this.addHeader('Attendance Report', `${data.attendanceRecords.length} attendance records`);

    // Add statistics
    this.addStatsSection([
      { label: 'Total Sessions', value: data.stats.totalSessions.toString(), color: '#dbeafe' },
      { label: 'Average Attendance', value: data.stats.averageAttendance.toString(), color: '#d1fae5' },
      { label: 'Highest Attendance', value: data.stats.highestAttendance.toString(), color: '#dcfce7' },
      { label: 'Lowest Attendance', value: data.stats.lowestAttendance.toString(), color: '#fef3c7' },
    ]);

    // Attendance table
    const columns = [
      { header: 'Date', dataKey: 'date' },
      { header: 'Event', dataKey: 'event' },
      { header: 'Member', dataKey: 'member' },
      { header: 'Status', dataKey: 'status' },
      { header: 'Notes', dataKey: 'notes' },
    ];

    const rows = data.attendanceRecords
      .sort((a, b) => new Date(b.event.date).getTime() - new Date(a.event.date).getTime())
      .map(record => ({
        date: formatDate(record.event.date),
        event: record.event.type === 'training' ? 'Training' : `vs ${record.event.opponent}`,
        member: record.member.name,
        status: record.attendance.status.charAt(0).toUpperCase() + record.attendance.status.slice(1),
        notes: record.attendance.notes || 'No notes',
      }));

    (this.doc as any).autoTable({
      head: [columns.map(col => col.header)],
      body: rows.map(row => columns.map(col => row[col.dataKey as keyof typeof row])),
      startY: this.currentY,
      styles: { fontSize: FONTS.body, cellPadding: 3 },
      headStyles: { fillColor: COLORS.primary, textColor: '#ffffff' },
      alternateRowStyles: { fillColor: COLORS.lightGray },
    });

    this.save('fitholics-fc-attendance');
  }
}

/**
 * Leadership PDF Export
 */
export class LeadershipPDFExporter extends BasePDFExporter {
  exportLeadership(data: { leadership: Leadership[]; members: Member[] }): void {
    this.addHeader('Leadership Structure', `${data.leadership.length} leadership positions`);

    // Add statistics
    const activeRoles = data.leadership.filter(l => l.isActive).length;
    const inactiveRoles = data.leadership.filter(l => !l.isActive).length;

    this.addStatsSection([
      { label: 'Total Positions', value: data.leadership.length.toString(), color: '#dbeafe' },
      { label: 'Active Roles', value: activeRoles.toString(), color: '#d1fae5' },
      { label: 'Inactive Roles', value: inactiveRoles.toString(), color: '#fef3c7' },
    ]);

    // Leadership table
    const columns = [
      { header: 'Member', dataKey: 'member' },
      { header: 'Role', dataKey: 'role' },
      { header: 'Start Date', dataKey: 'startDate' },
      { header: 'Status', dataKey: 'status' },
    ];

    const rows = data.leadership
      .sort((a, b) => a.role.localeCompare(b.role))
      .map(leadership => {
        const member = data.members.find(m => m.id === leadership.memberId);
        return {
          member: member ? member.name : 'Unknown Member',
          role: leadership.role,
          startDate: formatDate(leadership.startDate),
          status: leadership.isActive ? 'Active' : 'Inactive',
        };
      });

    (this.doc as any).autoTable({
      head: [columns.map(col => col.header)],
      body: rows.map(row => columns.map(col => row[col.dataKey as keyof typeof row])),
      startY: this.currentY,
      styles: { fontSize: FONTS.body, cellPadding: 3 },
      headStyles: { fillColor: COLORS.yellow, textColor: '#000000' },
      alternateRowStyles: { fillColor: COLORS.lightGray },
    });

    this.save('fitholics-fc-leadership');
  }
}

// Export all classes
export {
  DashboardPDFExporter,
  MembersPDFExporter,
  ContributionsPDFExporter,
  EventsPDFExporter,
  AttendancePDFExporter,
  LeadershipPDFExporter,
};