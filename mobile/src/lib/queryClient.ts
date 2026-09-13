import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1, refetchOnWindowFocus: false },
  },
});

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "savyn-query-cache",
});

// How long a persisted cache entry is trusted after app restart before
// being discarded outright (still refetched in the background regardless).
export const QUERY_PERSIST_MAX_AGE = 1000 * 60 * 60 * 24;
