import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Category } from '../types';

interface CategoriesState {
  items: Category[];
  isLoading: boolean;
  error: string | null;
}

const initialState: CategoriesState = {
  items: [
    { id: '1', name: 'Food & Groceries', type: 'essential' },
    { id: '2', name: 'Housing & Utilities', type: 'essential' },
    { id: '3', name: 'Transport', type: 'essential' },
    { id: '4', name: 'Shopping', type: 'lifestyle' },
    { id: '5', name: 'Entertainment', type: 'lifestyle' },
    { id: '6', name: 'Health & Wellness', type: 'lifestyle' },
    { id: '7', name: 'Income', type: 'financial' },
    { id: '8', name: 'Investments', type: 'financial' },
    { id: '9', name: 'Bills & Payments', type: 'financial' },
  ],
  isLoading: false,
  error: null,
};

export const categoriesSlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {
    setCategories: (state, action: PayloadAction<Category[]>) => {
      state.items = action.payload;
    },
    addCategory: (state, action: PayloadAction<Category>) => {
      state.items.push(action.payload);
    },
    updateCategory: (state, action: PayloadAction<Category>) => {
      const index = state.items.findIndex(item => item.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    },
    deleteCategory: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(item => item.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  setLoading,
  setError,
} = categoriesSlice.actions;

export default categoriesSlice.reducer;
