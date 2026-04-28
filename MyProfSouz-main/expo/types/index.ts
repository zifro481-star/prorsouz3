export interface User {
  id: string;
  role: string;
  fullName: string;
  email: string;
  phone?: string;
  city?: string;
  profession?: string;
  memberNumber?: string;
  status?: string;
  unionId?: string;
  unionName?: string;
  divisionId?: string;
  divisionName?: string;
  avatarUrl?: string;
}

export interface Union {
  id: string;
  name: string;
  divisions: Division[];
}

export interface Division {
  id: string;
  name: string;
}

export interface Lead {
  id: string;
  title?: string;
  description?: string;
  requestType?: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

export interface LegalRequest {
  id: string;
  subject: string;
  category: string;
  description: string;
  status: string;
  answer?: string;
  attachments?: FileAttachment[];
  createdAt: string;
  updatedAt?: string;
}

export interface FileAttachment {
  fileName: string;
  fileUrl: string;
  fileSize: number;
}

export interface Colleague {
  id: string;
  fullName: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
  isLeader?: boolean;
}

export interface DirectChat {
  id: string;
  participant: Colleague;
  lastMessage?: ChatMessage;
  updatedAt?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  participant?: Colleague;
  lastMessage?: ChatMessage;
  updatedAt?: string;
}

export interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface AIChatResponse {
  messages: AIChatMessage[];
}

export interface AIChatReply {
  reply: string;
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  summary?: string;
  imageUrl?: string;
  createdAt: string;
  author?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  type?: string;
}

export interface ProfileUpdateData {
  fullName?: string;
  phone?: string;
  city?: string;
  profession?: string;
}

export interface LoginResponse {
  user: User;
  token?: string;
}

export interface RegisterData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  unionId: string;
  divisionId: string;
  acceptTerms?: boolean;
  acceptData?: boolean;
  acceptPrivacy?: boolean;
  consents?: string[];
}

export interface UnionEvent {
  id: string;
  title: string;
  description?: string;
  content?: string;
  imageUrl?: string;
  date?: string;
  createdAt: string;
}

export interface UnionDocument {
  id: string;
  title: string;
  fileUrl: string;
  fileType?: string;
  createdAt?: string;
}

export interface Partner {
  id: string;
  name: string;
  description?: string;
  conditions?: string;
  discountText?: string;
  logoUrl?: string;
  websiteUrl?: string;
  isActive?: boolean;
}

export interface Survey {
  id: string;
  title: string;
  description?: string;
  status?: string;
  completed?: boolean;
  questionsCount?: number;
  createdAt?: string;
}

export interface SurveyQuestion {
  id: string;
  text: string;
  type: 'single_choice' | 'multiple_choice' | 'text';
  options?: SurveyOption[];
}

export interface SurveyOption {
  id: string;
  text: string;
}

export interface SurveyDetail {
  id: string;
  title: string;
  description?: string;
  questions: SurveyQuestion[];
}

export interface SurveyAnswer {
  questionId: string;
  optionIds?: string[];
  textAnswer?: string;
}

export interface LearningModule {
  id: string;
  title: string;
  description?: string;
  progress?: number;
  lessonsCount?: number;
  completedLessons?: number;
  lessons?: LearningLesson[];
}

export interface LearningLesson {
  id: string;
  title: string;
  content?: string;
  completed?: boolean;
  order?: number;
}

export const LEGAL_CATEGORIES: Record<string, string> = {
  labor_disputes: 'Трудовые споры',
  dismissal: 'Увольнение',
  salary: 'Заработная плата',
  vacation: 'Отпуск',
  labor_safety: 'Охрана труда',
  disciplinary: 'Дисциплинарные взыскания',
  benefits: 'Льготы и гарантии',
  other: 'Другое',
};
