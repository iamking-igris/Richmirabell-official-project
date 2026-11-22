import { create } from 'zustand';
import { arrayMove } from '@dnd-kit/sortable';
import type { BlockType, NoteBlock, NoteDocument } from './note-schema';

interface NoteStoreState {
  currentTopicId: string | null;
  doc: NoteDocument;
  savedTopics: Record<string, NoteDocument>;
  loadTopic: (topicId: string, fallback?: Partial<NoteDocument>, force?: boolean) => void;
  removeNotesForTopics: (topicIds: string[]) => void;
  setDocument: (newDoc: NoteDocument) => void;
  updateMeta: (field: keyof Omit<NoteDocument, 'blocks'>, value: string) => void;
  addBlock: (type: BlockType, index?: number) => void;
  updateBlock: (id: string, updates: Partial<NoteBlock>) => void;
  removeBlock: (id: string) => void;
  moveBlock: (id: string, direction: 'up' | 'down') => void;
  reorderBlocks: (activeId: string, overId: string) => void;
  setBlocks: (blocks: NoteBlock[]) => void;
  resetToDefault: () => void;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `block_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function createDefaultBlock(type: BlockType): NoteBlock {
  const id = generateId();
  switch (type) {
    case 'objectives':
      return {
        id,
        type: 'objectives',
        items: ['First learning objective...'],
      };
    case 'heading':
      return { id, type: 'heading', text: '' };
    case 'paragraph':
      return { id, type: 'paragraph', text: '' };
    case 'formula':
      return { id, type: 'formula', latex: '' };
    case 'diagram':
      return { id, type: 'diagram', imageUrl: '', caption: '' };
  }
}

export const useNoteStore = create<NoteStoreState>((set, get) => ({
  currentTopicId: null,
  doc: {
    subject: '',
    topic: '',
    title: '',
    subtitle: '',
    meta: '',
    blocks: [],
  },
  savedTopics: {},

  loadTopic: (topicId, fallback, force) => {
    const { savedTopics, currentTopicId, doc } = get();
    if (currentTopicId === topicId && !force) return;

    // Save existing doc before switching
    const updatedSaved = { ...savedTopics };
    if (currentTopicId && currentTopicId !== topicId) {
      updatedSaved[currentTopicId] = doc;
    }

    if (updatedSaved[topicId] && !force) {
      set({
        currentTopicId: topicId,
        doc: updatedSaved[topicId],
        savedTopics: updatedSaved,
      });
      return;
    }

    // Initialize note for this topic - blank with no mockup data unless explicitly provided
    const newDoc: NoteDocument = {
      subject: fallback?.subject ?? '',
      topic: fallback?.topic ?? '',
      title: fallback?.title ?? '',
      subtitle: fallback?.subtitle ?? '',
      meta: fallback?.meta ?? '',
      blocks: Array.isArray(fallback?.blocks) ? fallback.blocks : [],
    };

    updatedSaved[topicId] = newDoc;
    set({
      currentTopicId: topicId,
      doc: newDoc,
      savedTopics: updatedSaved,
    });
  },

  removeNotesForTopics: (topicIds) => {
    set((state) => {
      const idsSet = new Set(topicIds);
      const updatedSaved = { ...state.savedTopics };
      for (const id of topicIds) {
        delete updatedSaved[id];
      }
      const isCurrentDeleted = state.currentTopicId ? idsSet.has(state.currentTopicId) : false;
      return {
        savedTopics: updatedSaved,
        currentTopicId: isCurrentDeleted ? null : state.currentTopicId,
      };
    });
  },

  setDocument: (newDoc) => {
    set((state) => {
      const savedTopics = { ...state.savedTopics };
      if (state.currentTopicId) {
        savedTopics[state.currentTopicId] = newDoc;
      }
      return {
        doc: newDoc,
        savedTopics,
      };
    });
  },

  updateMeta: (field, value) => {
    set((state) => {
      const updatedDoc = {
        ...state.doc,
        [field]: value,
      };
      const savedTopics = { ...state.savedTopics };
      if (state.currentTopicId) {
        savedTopics[state.currentTopicId] = updatedDoc;
      }
      return {
        doc: updatedDoc,
        savedTopics,
      };
    });
  },

  addBlock: (type, index) => {
    set((state) => {
      const newBlock = createDefaultBlock(type);
      const newBlocks = [...state.doc.blocks];
      if (typeof index === 'number' && index >= 0 && index <= newBlocks.length) {
        newBlocks.splice(index, 0, newBlock);
      } else {
        newBlocks.push(newBlock);
      }
      const updatedDoc = {
        ...state.doc,
        blocks: newBlocks,
      };
      const savedTopics = { ...state.savedTopics };
      if (state.currentTopicId) {
        savedTopics[state.currentTopicId] = updatedDoc;
      }
      return {
        doc: updatedDoc,
        savedTopics,
      };
    });
  },

  updateBlock: (id, updates) => {
    set((state) => {
      const updatedBlocks = state.doc.blocks.map((block) =>
        block.id === id ? ({ ...block, ...updates } as NoteBlock) : block
      );
      const updatedDoc = {
        ...state.doc,
        blocks: updatedBlocks,
      };
      const savedTopics = { ...state.savedTopics };
      if (state.currentTopicId) {
        savedTopics[state.currentTopicId] = updatedDoc;
      }
      return {
        doc: updatedDoc,
        savedTopics,
      };
    });
  },

  removeBlock: (id) => {
    set((state) => {
      const updatedBlocks = state.doc.blocks.filter((block) => block.id !== id);
      const updatedDoc = {
        ...state.doc,
        blocks: updatedBlocks,
      };
      const savedTopics = { ...state.savedTopics };
      if (state.currentTopicId) {
        savedTopics[state.currentTopicId] = updatedDoc;
      }
      return {
        doc: updatedDoc,
        savedTopics,
      };
    });
  },

  moveBlock: (id, direction) => {
    set((state) => {
      const index = state.doc.blocks.findIndex((b) => b.id === id);
      if (index === -1) return state;

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= state.doc.blocks.length) return state;

      const newBlocks = [...state.doc.blocks];
      const [movedBlock] = newBlocks.splice(index, 1);
      newBlocks.splice(targetIndex, 0, movedBlock);

      const updatedDoc = {
        ...state.doc,
        blocks: newBlocks,
      };
      const savedTopics = { ...state.savedTopics };
      if (state.currentTopicId) {
        savedTopics[state.currentTopicId] = updatedDoc;
      }
      return {
        doc: updatedDoc,
        savedTopics,
      };
    });
  },

  reorderBlocks: (activeId, overId) => {
    set((state) => {
      const oldIndex = state.doc.blocks.findIndex((b) => b.id === activeId);
      const newIndex = state.doc.blocks.findIndex((b) => b.id === overId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return state;

      const updatedBlocks = arrayMove(state.doc.blocks, oldIndex, newIndex);
      const updatedDoc = {
        ...state.doc,
        blocks: updatedBlocks,
      };
      const savedTopics = { ...state.savedTopics };
      if (state.currentTopicId) {
        savedTopics[state.currentTopicId] = updatedDoc;
      }
      return {
        doc: updatedDoc,
        savedTopics,
      };
    });
  },

  setBlocks: (blocks) => {
    set((state) => {
      const updatedDoc = {
        ...state.doc,
        blocks,
      };
      const savedTopics = { ...state.savedTopics };
      if (state.currentTopicId) {
        savedTopics[state.currentTopicId] = updatedDoc;
      }
      return {
        doc: updatedDoc,
        savedTopics,
      };
    });
  },

  resetToDefault: () => {
    set((state) => {
      const emptyDoc: NoteDocument = {
        ...state.doc,
        blocks: [],
      };
      const savedTopics = { ...state.savedTopics };
      if (state.currentTopicId) {
        savedTopics[state.currentTopicId] = emptyDoc;
      }
      return {
        doc: emptyDoc,
        savedTopics,
      };
    });
  },
}));
