import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  DocumentData,
  QuerySnapshot,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Member, Event, Contribution, Leadership, Attendance, Expense } from '../types';
import type { InventoryItem } from '../types';

// Generic CRUD operations
export class FirestoreService {
  // Create document
  static async create<T>(collectionName: string, data: Omit<T, 'id'>): Promise<string> {
    if (!db) {
      throw new Error('Firestore is not initialized. Please check your Firebase configuration.');
    }

    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      return docRef.id;
    } catch (error: any) {
      console.error(`Error creating document in ${collectionName}:`, error);
      if (error.code === 'permission-denied') {
        throw new Error('Permission denied. Please check your Firestore security rules.');
      }
      throw error;
    }
  }

  // Read all documents with automatic sorting
  static async getAll<T>(collectionName: string): Promise<T[]> {
    if (!db) {
      console.warn('Firestore is not initialized. Returning empty array.');
      return [];
    }

    try {
      const querySnapshot = await getDocs(collection(db, collectionName));
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as T[];

      console.log(`Fetched ${data.length} documents from ${collectionName}`);
      
      // Apply automatic sorting based on collection type
      return this.applySorting(data, collectionName);
    } catch (error: any) {
      console.error(`Error fetching documents from ${collectionName}:`, error);
      if (error.code === 'permission-denied') {
        console.warn(`Permission denied for collection ${collectionName}. Returning empty array.`);
        return [];
      }
      // For other errors, still return empty array to prevent app crashes
      console.warn(`Returning empty array due to error in ${collectionName}`);
      return [];
    }
  }

  // Read single document
  static async getById<T>(collectionName: string, id: string): Promise<T | null> {
    if (!db) {
      console.warn('Firestore is not initialized. Returning null.');
      return null;
    }

    try {
      const docRef = doc(db, collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
        } as T;
      }
      return null;
    } catch (error: any) {
      console.error(`Error fetching document ${id} from ${collectionName}:`, error);
      if (error.code === 'permission-denied') {
        console.warn(`Permission denied for document ${id} in ${collectionName}.`);
        return null;
      }
      throw error;
    }
  }

  // Update document
  static async update<T>(collectionName: string, id: string, data: Partial<T>): Promise<void> {
    if (!db) {
      throw new Error('Firestore is not initialized. Please check your Firebase configuration.');
    }

    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now(),
      });
    } catch (error: any) {
      console.error(`Error updating document ${id} in ${collectionName}:`, error);
      if (error.code === 'permission-denied') {
        throw new Error('Permission denied. Please check your Firestore security rules.');
      }
      throw error;
    }
  }

  // Delete document
  static async delete(collectionName: string, id: string): Promise<void> {
    if (!db) {
      throw new Error('Firestore is not initialized. Please check your Firebase configuration.');
    }

    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
    } catch (error: any) {
      console.error(`Error deleting document ${id} from ${collectionName}:`, error);
      if (error.code === 'permission-denied') {
        throw new Error('Permission denied. Please check your Firestore security rules.');
      }
      throw error;
    }
  }

  // Query with conditions and automatic sorting
  static async query<T>(
    collectionName: string,
    conditions: { field: string; operator: any; value: any }[] = [],
    orderByField?: string,
    orderDirection: 'asc' | 'desc' = 'asc'
  ): Promise<T[]> {
    if (!db) {
      console.warn('Firestore is not initialized. Returning empty array.');
      return [];
    }

    try {
      let q = collection(db, collectionName);
      
      // Apply where conditions
      conditions.forEach(condition => {
        q = query(q, where(condition.field, condition.operator, condition.value)) as any;
      });
      
      // Apply ordering
      if (orderByField) {
        q = query(q, orderBy(orderByField, orderDirection)) as any;
      }
      
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as T[];

      // Apply automatic sorting if no specific ordering was requested
      if (!orderByField) {
        return this.applySorting(data, collectionName);
      }

      return data;
    } catch (error: any) {
      console.error(`Error querying ${collectionName}:`, error);
      if (error.code === 'permission-denied') {
        console.warn(`Permission denied for querying ${collectionName}. Returning empty array.`);
        return [];
      }
      throw error;
    }
  }

  // Apply automatic sorting based on collection type
  private static applySorting<T>(data: T[], collectionName: string): T[] {
    switch (collectionName) {
      case 'members':
        // Sort members alphabetically by name
        return data.sort((a: any, b: any) => {
          const nameA = a.name?.toLowerCase() || '';
          const nameB = b.name?.toLowerCase() || '';
          return nameA.localeCompare(nameB);
        });

      case 'events':
        // Sort events by date (past to present - earliest first)
        return data.sort((a: any, b: any) => {
          const dateA = new Date(a.date || 0);
          const dateB = new Date(b.date || 0);
          return dateA.getTime() - dateB.getTime();
        });

      case 'contributions':
        // Sort contributions by date (latest first)
        return data.sort((a: any, b: any) => {
          const dateA = new Date(a.date || 0);
          const dateB = new Date(b.date || 0);
          return dateB.getTime() - dateA.getTime();
        });

      case 'expenses':
        // Sort expenses by date (latest first)
        return data.sort((a: any, b: any) => {
          const dateA = new Date(a.date || 0);
          const dateB = new Date(b.date || 0);
          return dateB.getTime() - dateA.getTime();
        });

      case 'attendance':
        // Sort attendance by recorded date (latest first)
        return data.sort((a: any, b: any) => {
          const dateA = new Date(a.recordedAt || 0);
          const dateB = new Date(b.recordedAt || 0);
          return dateB.getTime() - dateA.getTime();
        });

      case 'leadership':
        // Sort leadership by member name alphabetically
        return data.sort((a: any, b: any) => {
          const roleA = a.role?.toLowerCase() || '';
          const roleB = b.role?.toLowerCase() || '';
          return roleA.localeCompare(roleB);
        });

      default:
        return data;
    }
  }

  // Real-time listener with automatic sorting
  static subscribeToCollection<T>(
    collectionName: string,
    callback: (data: T[]) => void,
    conditions: { field: string; operator: any; value: any }[] = []
  ): () => void {
    if (!db) {
      console.warn('Firestore is not initialized. Subscription will not work.');
      callback([]);
      return () => {};
    }

    try {
      let q = collection(db, collectionName);
      
      conditions.forEach(condition => {
        q = query(q, where(condition.field, condition.operator, condition.value)) as any;
      });
      
      const unsubscribe = onSnapshot(q, 
        (querySnapshot) => {
          const data = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as T[];
          
          // Apply automatic sorting
          const sortedData = this.applySorting(data, collectionName);
          callback(sortedData);
        },
        (error) => {
          console.error(`Error in subscription to ${collectionName}:`, error);
          if (error.code === 'permission-denied') {
            console.warn(`Permission denied for subscription to ${collectionName}.`);
          }
          callback([]);
        }
      );
      
      return unsubscribe;
    } catch (error: any) {
      console.error(`Error subscribing to ${collectionName}:`, error);
      callback([]);
      return () => {};
    }
  }
}

// Specific service classes for each entity
export class MemberService {
  private static collection = 'members';

  static async createMember(memberData: Omit<Member, 'id'>): Promise<string> {
    return FirestoreService.create<Member>(this.collection, memberData);
  }

  static async getAllMembers(): Promise<Member[]> {
    return FirestoreService.getAll<Member>(this.collection);
  }

  static async getMemberById(id: string): Promise<Member | null> {
    return FirestoreService.getById<Member>(this.collection, id);
  }

  static async updateMember(id: string, memberData: Partial<Member>): Promise<void> {
    return FirestoreService.update<Member>(this.collection, id, memberData);
  }

  static async deleteMember(id: string): Promise<void> {
    return FirestoreService.delete(this.collection, id);
  }

  static async getActiveMembers(): Promise<Member[]> {
    const members = await FirestoreService.query<Member>(this.collection, [
      { field: 'status', operator: '==', value: 'active' }
    ]);
    // Sort alphabetically by name
    return members.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  }

  static subscribeToMembers(callback: (members: Member[]) => void): () => void {
    return FirestoreService.subscribeToCollection<Member>(this.collection, callback);
  }
}

export class EventService {
  private static collection = 'events';

  static async createEvent(eventData: Omit<Event, 'id'>): Promise<string> {
    return FirestoreService.create<Event>(this.collection, eventData);
  }

  static async getAllEvents(): Promise<Event[]> {
    return FirestoreService.getAll<Event>(this.collection);
  }

  static async getEventById(id: string): Promise<Event | null> {
    return FirestoreService.getById<Event>(this.collection, id);
  }

  static async updateEvent(id: string, eventData: Partial<Event>): Promise<void> {
    return FirestoreService.update<Event>(this.collection, id, eventData);
  }

  static async deleteEvent(id: string): Promise<void> {
    return FirestoreService.delete(this.collection, id);
  }

  static async getEventsByType(type: 'training' | 'friendly'): Promise<Event[]> {
    try {
      // Query only by type to avoid composite index requirement
      const events = await FirestoreService.query<Event>(this.collection, [
        { field: 'type', operator: '==', value: type }
      ]);
      
      // Sort by date (past to present - earliest first)
      return events.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      });
    } catch (error) {
      console.error(`Error fetching events by type ${type}:`, error);
      return [];
    }
  }

  static async getUpcomingEvents(): Promise<Event[]> {
    try {
      const now = new Date();
      const events = await FirestoreService.getAll<Event>(this.collection);
      
      // Filter for upcoming events and sort by date (earliest first for upcoming)
      return events
        .filter(event => new Date(event.date) >= now)
        .sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateA.getTime() - dateB.getTime();
        });
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
      return [];
    }
  }

  static subscribeToEvents(callback: (events: Event[]) => void): () => void {
    return FirestoreService.subscribeToCollection<Event>(this.collection, callback);
  }
}

export class ContributionService {
  private static collection = 'contributions';

  static async createContribution(contributionData: Omit<Contribution, 'id'>): Promise<string> {
    return FirestoreService.create<Contribution>(this.collection, contributionData);
  }

  static async getAllContributions(): Promise<Contribution[]> {
    return FirestoreService.getAll<Contribution>(this.collection);
  }

  static async getContributionById(id: string): Promise<Contribution | null> {
    return FirestoreService.getById<Contribution>(this.collection, id);
  }

  static async updateContribution(id: string, contributionData: Partial<Contribution>): Promise<void> {
    return FirestoreService.update<Contribution>(this.collection, id, contributionData);
  }

  static async deleteContribution(id: string): Promise<void> {
    return FirestoreService.delete(this.collection, id);
  }

  static async getContributionsByMember(memberId: string): Promise<Contribution[]> {
    const contributions = await FirestoreService.query<Contribution>(this.collection, [
      { field: 'memberId', operator: '==', value: memberId }
    ]);
    // Sort by date (latest first)
    return contributions.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });
  }

  static async getContributionsByType(type: 'monetary' | 'in-kind'): Promise<Contribution[]> {
    const contributions = await FirestoreService.query<Contribution>(this.collection, [
      { field: 'type', operator: '==', value: type }
    ]);
    // Sort by date (latest first)
    return contributions.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });
  }

  static subscribeToContributions(callback: (contributions: Contribution[]) => void): () => void {
    return FirestoreService.subscribeToCollection<Contribution>(this.collection, callback);
  }
}

export class ExpenseService {
  private static collection = 'expenses';

  static async createExpense(expenseData: Omit<Expense, 'id'>): Promise<string> {
    return FirestoreService.create<Expense>(this.collection, expenseData);
  }

  static async getAllExpenses(): Promise<Expense[]> {
    return FirestoreService.getAll<Expense>(this.collection);
  }

  static async getExpenseById(id: string): Promise<Expense | null> {
    return FirestoreService.getById<Expense>(this.collection, id);
  }

  static async updateExpense(id: string, expenseData: Partial<Expense>): Promise<void> {
    return FirestoreService.update<Expense>(this.collection, id, expenseData);
  }

  static async deleteExpense(id: string): Promise<void> {
    return FirestoreService.delete(this.collection, id);
  }

  static async getExpensesByCategory(category: string): Promise<Expense[]> {
    const expenses = await FirestoreService.query<Expense>(this.collection, [
      { field: 'category', operator: '==', value: category }
    ]);
    // Sort by date (latest first)
    return expenses.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });
  }

  static subscribeToExpenses(callback: (expenses: Expense[]) => void): () => void {
    return FirestoreService.subscribeToCollection<Expense>(this.collection, callback);
  }
}

export class LeadershipService {
  private static collection = 'leadership';

  static async createLeadership(leadershipData: Omit<Leadership, 'id'>): Promise<string> {
    return FirestoreService.create<Leadership>(this.collection, leadershipData);
  }

  static async getAllLeadership(): Promise<Leadership[]> {
    return FirestoreService.getAll<Leadership>(this.collection);
  }

  static async getLeadershipById(id: string): Promise<Leadership | null> {
    return FirestoreService.getById<Leadership>(this.collection, id);
  }

  static async updateLeadership(id: string, leadershipData: Partial<Leadership>): Promise<void> {
    return FirestoreService.update<Leadership>(this.collection, id, leadershipData);
  }

  static async deleteLeadership(id: string): Promise<void> {
    return FirestoreService.delete(this.collection, id);
  }

  static async getActiveLeadership(): Promise<Leadership[]> {
    const leadership = await FirestoreService.query<Leadership>(this.collection, [
      { field: 'isActive', operator: '==', value: true }
    ]);
    // Sort by role alphabetically
    return leadership.sort((a, b) => a.role.toLowerCase().localeCompare(b.role.toLowerCase()));
  }

  static async getLeadershipByMember(memberId: string): Promise<Leadership[]> {
    const leadership = await FirestoreService.query<Leadership>(this.collection, [
      { field: 'memberId', operator: '==', value: memberId }
    ]);
    // Sort by role alphabetically
    return leadership.sort((a, b) => a.role.toLowerCase().localeCompare(b.role.toLowerCase()));
  }

  static subscribeToLeadership(callback: (leadership: Leadership[]) => void): () => void {
    return FirestoreService.subscribeToCollection<Leadership>(this.collection, callback);
  }
}

export class AttendanceService {
  private static collection = 'attendance';

  static async createAttendance(attendanceData: Omit<Attendance, 'id'>): Promise<string> {
    return FirestoreService.create<Attendance>(this.collection, attendanceData);
  }

  static async getAllAttendance(): Promise<Attendance[]> {
    return FirestoreService.getAll<Attendance>(this.collection);
  }

  static async getAttendanceById(id: string): Promise<Attendance | null> {
    return FirestoreService.getById<Attendance>(this.collection, id);
  }

  static async updateAttendance(id: string, attendanceData: Partial<Attendance>): Promise<void> {
    return FirestoreService.update<Attendance>(this.collection, id, attendanceData);
  }

  static async deleteAttendance(id: string): Promise<void> {
    return FirestoreService.delete(this.collection, id);
  }

  static async getAttendanceByEvent(eventId: string): Promise<Attendance[]> {
    const attendance = await FirestoreService.query<Attendance>(this.collection, [
      { field: 'eventId', operator: '==', value: eventId }
    ]);
    // Sort by recorded date (latest first)
    return attendance.sort((a, b) => {
      const dateA = new Date(a.recordedAt);
      const dateB = new Date(b.recordedAt);
      return dateB.getTime() - dateA.getTime();
    });
  }

  static async getAttendanceByMember(memberId: string): Promise<Attendance[]> {
    const attendance = await FirestoreService.query<Attendance>(this.collection, [
      { field: 'memberId', operator: '==', value: memberId }
    ]);
    // Sort by recorded date (latest first)
    return attendance.sort((a, b) => {
      const dateA = new Date(a.recordedAt);
      const dateB = new Date(b.recordedAt);
      return dateB.getTime() - dateA.getTime();
    });
  }

  static subscribeToAttendance(callback: (attendance: Attendance[]) => void): () => void {
    return FirestoreService.subscribeToCollection<Attendance>(this.collection, callback);
  }
}

export class InventoryService {
  private static collection = 'inventory';

  static async createInventoryItem(itemData: Omit<InventoryItem, 'id'>): Promise<string> {
    return FirestoreService.create<InventoryItem>(this.collection, itemData);
  }

  static async getAllInventoryItems(): Promise<InventoryItem[]> {
    return FirestoreService.getAll<InventoryItem>(this.collection);
  }

  static async getInventoryItemById(id: string): Promise<InventoryItem | null> {
    return FirestoreService.getById<InventoryItem>(this.collection, id);
  }

  static async updateInventoryItem(id: string, itemData: Partial<InventoryItem>): Promise<void> {
    return FirestoreService.update<InventoryItem>(this.collection, id, itemData);
  }

  static async deleteInventoryItem(id: string): Promise<void> {
    return FirestoreService.delete(this.collection, id);
  }

  static async getInventoryByCategory(category: string): Promise<InventoryItem[]> {
    const items = await FirestoreService.query<InventoryItem>(this.collection, [
      { field: 'category', operator: '==', value: category }
    ]);
    // Sort by name alphabetically
    return items.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  }

  static async getLowStockItems(): Promise<InventoryItem[]> {
    const items = await FirestoreService.getAll<InventoryItem>(this.collection);
    return items.filter(item => 
      item.status === 'low_stock' || 
      item.status === 'out_of_stock' ||
      item.quantity <= item.minQuantity
    );
  }

  static subscribeToInventory(callback: (items: InventoryItem[]) => void): () => void {
    return FirestoreService.subscribeToCollection<InventoryItem>(this.collection, callback);
  }
}