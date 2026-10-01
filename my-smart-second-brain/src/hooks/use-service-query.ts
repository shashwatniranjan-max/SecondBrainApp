import { useCallback, useEffect, useState } from "react";

export type QueryState<T> =
  | { status: "loading"; data: null; error: null }
  | { status: "success"; data: T; error: null }
  | { status: "error"; data: null; error: Error };

export function useServiceQuery<T>(
  query: () => Promise<T>,
  dependencies: React.DependencyList = [],
) {
  const [state, setState] = useState<QueryState<T>>({ status: "loading", data: null, error: null });
  const run = useCallback(() => {
    let active = true;
    setState({ status: "loading", data: null, error: null });
    query()
      .then((data) => active && setState({ status: "success", data, error: null }))
      .catch(
        (error: unknown) =>
          active &&
          setState({
            status: "error",
            data: null,
            error: error instanceof Error ? error : new Error("Unknown error"),
          }),
      );
    return () => {
      active = false;
    };
  }, dependencies);
  useEffect(() => run(), [run]);
  return { ...state, retry: run };
}
