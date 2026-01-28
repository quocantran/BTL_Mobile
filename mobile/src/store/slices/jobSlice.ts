import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { IJob, IPaginatedResponse, IMeta } from '../../types';
import { jobService, IJobSearchParams } from '../../services/jobService';

export interface JobState {
  jobs: IJob[];
  topJobs: IJob[];
  currentJob: IJob | null;
  meta: IMeta | null;
  pagination: {
    current: number;
    pageSize: number;
    pages: number;
    total: number;
  } | null;
  isLoading: boolean;
  error: string | null;
  searchParams: IJobSearchParams;
}

const initialState: JobState = {
  jobs: [],
  topJobs: [],
  currentJob: null,
  meta: null,
  pagination: null,
  isLoading: false,
  error: null,
  searchParams: {
    current: 1,
    pageSize: 10,
  },
};

export const fetchJobs = createAsyncThunk(
  'jobs/fetchJobs',
  async (params: IJobSearchParams, { rejectWithValue }) => {
    try {
      const response = await jobService.getJobs(params);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Lấy danh sách công việc thất bại');
    }
  }
);

export const fetchJobById = createAsyncThunk(
  'jobs/fetchJobById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await jobService.getJobById(id);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Lấy chi tiết công việc thất bại');
    }
  }
);

export const fetchTopJobs = createAsyncThunk(
  'jobs/fetchTopJobs',
  async (limit: number = 10, { rejectWithValue }) => {
    try {
      const response = await jobService.getTopJobs(limit);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Lấy công việc nổi bật thất bại');
    }
  }
);

const jobSlice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {
    setSearchParams: (state, action) => {
      state.searchParams = { ...state.searchParams, ...action.payload };
    },
    clearSearchParams: (state) => {
      state.searchParams = { current: 1, pageSize: 10 };
    },
    clearCurrentJob: (state) => {
      state.currentJob = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchJobs.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchJobs.fulfilled, (state, action) => {
        state.isLoading = false;
        const incoming = action.payload.result || [];
        const meta = action.payload.meta || { current: 1, pageSize: incoming.length, pages: 1, total: incoming.length };
        // If this is page 1, replace list; otherwise append to existing results
        if (meta.current && meta.current > 1) {
          // avoid duplicates by appending only new ids
          const existingIds = new Set(state.jobs.map((j) => j._id));
          const toAppend = incoming.filter((j) => !existingIds.has(j._id));
          state.jobs = [...state.jobs, ...toAppend];
        } else {
          state.jobs = incoming;
        }
        state.meta = meta;
        state.pagination = {
          current: meta.current,
          pageSize: meta.pageSize,
          pages: meta.pages,
          total: meta.total,
        };
      })
      .addCase(fetchJobs.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchJobById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchJobById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentJob = action.payload;
      })
      .addCase(fetchJobById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchTopJobs.fulfilled, (state, action) => {
        state.topJobs = action.payload.result;
      });
  },
});

export const { setSearchParams, clearSearchParams, clearCurrentJob } = jobSlice.actions;
export default jobSlice.reducer;
