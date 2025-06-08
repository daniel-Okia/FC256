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
import { Member, Event, Contribution, Leadership, Attendance } from '../types';

// Generic CRUD operations
export class FirestoreService {
  // Create document
  static async create<T>(collectionName: string, data: Omit<T, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error(`Error creating document in ${collectionName}:`, error);
      throw error;
    }
  }

  // Read all documents
  static async getAll<T>(collectionName: string): Promise<T[]> {
    try {
      const querySnapshot = await getDocs(collection(db, collectionName));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as T[];
    } catch (error) {
      console.error(`Error fetching documents from ${collectionName}:`, error);
      throw error;
    }
  }

  // Read single document
  static async getById<T>(collectionName: string, id: string): Promise<T | null> {
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
    } catch (error) {
      console.error(`Error fetching document ${id} from ${collectionName}:`, error);
      throw error;
    }
  }

  // Update document
  static async update<T>(collectionName: string, id: string, data: Partial<T>): Promise<void> {
    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error(`Error updating document ${id} in ${collectionName}:`, error);
      throw error;
    }
  }

  // Delete document
  static async delete(collectionName: string, id: string): Promise<void> {
    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting document ${id} from ${collectionName}:`, error);
      throw error;
    }
  }

  // Query with conditions
  static async query<T>(
    collectionName: string,
    conditions: { field: string; operator: any; value: any }[] = [],
    orderByField?: string,
    orderDirection: 'asc' | 'desc' = 'asc'
  ): Promise<T[]> {
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
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as T[];
    } catch (error) {
      console.error(`Error querying ${collectionName}:`, error);
      throw error;
    }
  }

  // Real-time listener
  static subscribeToCollection<T>(
    collectionName: string,
    callback: (data: T[]) => void,
    conditions: { field: string; operator: any; value: any }[] = []
  ): () => void {
    try {
      let q = collection(db, collectionName);
      
      conditions.forEach(condition => {
        q = query(q, where(condition.field, condition.operator, condition.value)) as any;
      });
      
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as T[];
        callback(data);
      });
      
      return unsubscribe;
    } catch (error) {
      console.error(`Error subscribing to ${collectionName}:`, error);
      throw error;
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
    return FirestoreService.query<Member>(this.collection, [
      { field: 'status', operator: '==', value: 'active' }
    ]);
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
      
      // Sort by date in JavaScript instead of Firestore
      return events.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      });
    } catch (error) {
      console.error(`Error fetching events by type ${type}:`, error);
      throw error;
    }
  }

  static async getUpcomingEvents(): Promise<Event[]> {
    const now = new Date();
    return FirestoreService.query<Event>(this.collection, [
      { field: 'date', operator: '>=', value: Timestamp.fromDate(now) }
    ], 'date', 'asc');
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
    return FirestoreService.query<Contribution>(this.collection, [
      { field: 'memberId', operator: '==', value: memberId }
    ], 'date', 'desc');
  }

  static async getContributionsByType(type: 'monetary' | 'in-kind'): Promise<Contribution[]> {
    return FirestoreService.query<Contribution>(this.collection, [
      { field: 'type', operator: '==', value: type }
    ], 'date', 'desc');
  }

  static subscribeToContributions(callback: (contributions: Contribution[]) => void): () => void {
    return FirestoreService.subscribeToCollection<Contribution>(this.collection, callback);
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
    return FirestoreService.query<Leadership>(this.collection, [
      { field: 'isActive', operator: '==', value: true }
    ]);
  }

  static async getLeadershipByMember(memberId: string): Promise<Leadership[]> {
    return FirestoreService.query<Leadership>(this.collection, [
      { field: 'memberId', operator: '==', value: memberId }
    ]);
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
    return FirestoreService.query<Attendance>(this.collection, [
      { field: 'eventId', operator: '==', value: eventId }
    ]);
  }

  static async getAttendanceByMember(memberId: string): Promise<Attendance[]> {
    return FirestoreService.query<Attendance>(this.collection, [
      { field: 'memberId', operator: '==', value: memberId }
    ], 'recordedAt', 'desc');
  }

  static subscribeToAttendance(callback: (attendance: Attendance[]) => void): () => void {
    return FirestoreService.subscribeToCollection<Attendance>(this.collection, callback);
  }
}