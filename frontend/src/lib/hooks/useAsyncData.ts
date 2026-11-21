"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getApiErrorMessage } from "@/lib/api/client";

interface AsyncDataSnapshot<T> {
  requestKey: string;
  data: T | null;
  error: string | null;
}

export interface AsyncDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

const INITIAL_SNAPSHOT: AsyncDataSnapshot<never> = {
  requestKey: "",
  data: null,
  error: null,
};

/**
 * Menjalankan `fetcher` setiap kali `key` berubah dan menyimpan hasilnya di state.
 *
 * `key` dipakai sebagai pengganti array dependency: pemanggil cukup mengirim
 * representasi string dari parameter request (mis. `searchParams.toString()`),
 * sehingga effect tidak perlu bergantung pada identitas objek/closure.
 *
 * Status `loading` diturunkan dari perbandingan `requestKey`, bukan di-set di
 * dalam effect — ini menghindari setState sinkron yang memicu cascading render.
 */
export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  key = "default",
): AsyncDataResult<T> {
  const [reloadToken, setReloadToken] = useState(0);
  const [snapshot, setSnapshot] = useState<AsyncDataSnapshot<T>>(
    INITIAL_SNAPSHOT as AsyncDataSnapshot<T>,
  );
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const requestKey = `${key}:${reloadToken}`;

  useEffect(() => {
    let active = true;

    fetcherRef.current().then(
      (data) => {
        if (active) {
          setSnapshot({ requestKey, data, error: null });
        }
      },
      (error: unknown) => {
        if (active) {
          setSnapshot({
            requestKey,
            data: null,
            error: getApiErrorMessage(error),
          });
        }
      },
    );

    return () => {
      active = false;
    };
  }, [requestKey]);

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  const loading = snapshot.requestKey !== requestKey;

  return {
    // Data lama tetap dikembalikan selama pemuatan ulang supaya halaman edit
    // tidak me-remount form (dan menghapus isian yang belum disimpan).
    data: snapshot.data,
    error: snapshot.error,
    loading,
    reload,
  };
}
