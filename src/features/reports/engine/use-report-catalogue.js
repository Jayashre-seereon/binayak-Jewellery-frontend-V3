import { useEffect, useState } from "react";
import { getReportCatalogue } from "@/api/reportApi";
import { errorMessage } from "./report-utils";

// The catalogue is static per deployment, so fetch it once per page load.
let cache = null;
let pending = null;

const fetchCatalogue = () => {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = getReportCatalogue()
      .then((list) => {
        cache = list;
        return list;
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
};

export function useReportCatalogue() {
  const [state, setState] = useState({ catalogue: cache || [], loading: !cache, error: null });
  useEffect(() => {
    if (cache) return undefined;
    let alive = true;
    fetchCatalogue()
      .then((list) => alive && setState({ catalogue: list, loading: false, error: null }))
      .catch(async (e) => alive && setState({ catalogue: [], loading: false, error: await errorMessage(e, "Unable to load the report list.") }));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}
