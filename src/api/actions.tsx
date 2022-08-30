import React, { useCallback, useContext } from "react";
import type {
  Filter,
  FilterSuccessResponse,
  Incident,
  Event,
  AcknowledgementBody,
  Acknowledgement, IncidentTicketUrlBody,
} from "../api/types.d";

import api from "../api";
import type { InitialStateType, ActionsType } from "../state/contexts";
import {
  createFilter as createFilterAction,
  deleteFilter as deleteFilterAction,
  modifyFilter as modifyFilterAction,
  loadAllFilters as loadAllFiltersAction,
} from "../state/reducers/filter";

import { IncidentsStateType, useIncidentsContext } from "../components/incidentsprovider";

import { AppContext } from "../state/contexts";
import {setOngoingBulkUpdate, unsetOngoingBulkUpdate} from "../state/reducers/apistate";

type Dispatch = React.Dispatch<ActionsType>;

export const createFilter = (dispatch: Dispatch, filter: Omit<Filter, "pk">): Promise<Filter> => {
  return api.postFilter(filter).then((response: FilterSuccessResponse) => {
    const { name, pk } = response;
    const newFilter = { ...filter, name, pk };
    dispatch(createFilterAction(newFilter));
    return newFilter;
  });
};

export const deleteFilter = (dispatch: Dispatch, pk: Filter["pk"]): Promise<void> => {
  return api.deleteFilter(pk).then(() => {
    dispatch(deleteFilterAction(pk));
  });
};

export const modifyFilter = (dispatch: Dispatch, filter: Filter): Promise<Filter> => {
  return api.putFilter(filter).then(() => {
    dispatch(modifyFilterAction(filter));
    return filter;
  });
};

export const loadAllFilters = (dispatch: Dispatch): Promise<Filter[]> => {
  return api.getAllFilters().then((filters: Filter[]) => {
    dispatch(loadAllFiltersAction(filters));
    return filters;
  });
};

export type UseFiltersActionType = {
  createFilter: (filter: Omit<Filter, "pk">) => ReturnType<typeof createFilter>;
  deleteFilter: (pk: Filter["pk"]) => ReturnType<typeof deleteFilter>;
  modifyFilter: (filter: Filter) => ReturnType<typeof modifyFilter>;
  loadAllFilters: () => ReturnType<typeof loadAllFilters>;
};

export function useFilters(): [InitialStateType["filters"], UseFiltersActionType] {
  const {
    state: { filters },
    dispatch,
  } = useContext(AppContext);

  return [
    filters,
    {
      createFilter: (filter: Omit<Filter, "pk">) => createFilter(dispatch, filter),
      deleteFilter: (pk: Filter["pk"]) => deleteFilter(dispatch, pk),
      modifyFilter: (filter: Filter) => modifyFilter(dispatch, filter),
      loadAllFilters: () => loadAllFilters(dispatch),
    },
  ];
}

// const filterToQueryFilter = (filter: Omit<Filter, "pk">): Filter => {
//   return {
//     acked: filter.showAcked ? undefined : false,
//     open: filter.show === "both" ? undefined : filter.show === "open",
//     // stateful:
//     sourceSystemIds: filter.sourcesById,
//     tags: filter.tags.map((tag: Tag) => tag.original),
//   };
// };

export type UseIncidentsActionType = {
  loadIncidentsFiltered: (filter: Omit<Filter, "pk" | "name">) => Promise<Incident[]>;
  closeIncident: (pk: Incident["pk"], description?: string) => Promise<Event>;
  reopenIncident: (pk: Incident["pk"], description?: string) => Promise<Event>;
  acknowledgeIncident: (pk: Incident["pk"], ackBody: AcknowledgementBody) => Promise<Acknowledgement>;
  addTicketUrl: (pk: Incident["pk"], description: string) => Promise<IncidentTicketUrlBody>;
  bulkAcknowledgeIncidents: (pks: Incident["pk"][], ackBody: AcknowledgementBody) => Promise<Acknowledgement[]>;
  bulkAddTicketUrl: (pks: Incident["pk"][], description: string) => Promise<IncidentTicketUrlBody[]>;
  bulkReopenIncidents: (pks: Incident["pk"][], description?: string) => Promise<Event[]>;
  bulkCloseIncidents: (pks: Incident["pk"][], description?: string) => Promise<Event[]>;
};

export const useIncidents = (): [IncidentsStateType, UseIncidentsActionType] => {
  const [state, { loadAllIncidents, closeIncident, reopenIncident, acknowledgeIncident, addTicketUrl }] = useIncidentsContext();

  const { dispatch } = useContext(AppContext);

  const loadIncidentsFiltered = useCallback(
    (filter: Omit<Filter, "pk" | "name">) => {
      return api.getAllIncidentsFiltered(filter).then((incidents: Incident[]) => {
        loadAllIncidents(incidents);
        return incidents;
      });
    },
    [loadAllIncidents],
  );

  const closeIncidentCallback = useCallback(
    (pk: Incident["pk"], description?: string) =>
      api.postIncidentCloseEvent(pk, description).then((closeEvent: Event) => {
        closeIncident(pk);
        return closeEvent;
      }),
    [closeIncident],
  );

  const reopenIncidentCallback = useCallback(
    (pk: Incident["pk"]) =>
      api.postIncidentReopenEvent(pk).then((closeEvent: Event) => {
        reopenIncident(pk);
        return closeEvent;
      }),
    [reopenIncident],
  );

  const acknowledgeIncidentCallback = useCallback(
    (pk: Incident["pk"], ackBody: AcknowledgementBody) =>
      api.postAck(pk, ackBody).then((ack: Acknowledgement) => {
        acknowledgeIncident(pk);
        return ack;
      }),
    [acknowledgeIncident],
  );

  const addTicketUrlCallback = useCallback(
    (pk: Incident["pk"], ticketUrl: string) =>
      api.patchIncidentTicketUrl(pk, ticketUrl).then((response: IncidentTicketUrlBody) => {
        addTicketUrl(pk, ticketUrl);
        return response;
      }),
    [addTicketUrl],
  );

  const bulkAcknowledgeIncidentsCallback = useCallback(
      (async (pks: Incident["pk"][], ackBody: AcknowledgementBody) => {
        dispatch(setOngoingBulkUpdate());
        let acks: Acknowledgement[] = [];
        for (const pk of pks) {
          await api.postAck(pk, ackBody).then((ack: Acknowledgement) => {
            acks.push(ack);
          }).catch((error) => {
            dispatch(unsetOngoingBulkUpdate());
            throw new Error(error);
          })
        }
        dispatch(unsetOngoingBulkUpdate());
        return acks;
      }),
      [dispatch],
  );

    const bulkAddTicketUrlCallback = useCallback(
        (async (pks: Incident["pk"][], ticketUrl: string) => {
            dispatch(setOngoingBulkUpdate());
            let responses: IncidentTicketUrlBody[] = [];
            for (const pk of pks) {
                await api.patchIncidentTicketUrl(pk, ticketUrl)
                    .then((response: IncidentTicketUrlBody) => {
                        responses.push(response);
                    }).catch((error) => {
                        dispatch(unsetOngoingBulkUpdate());
                        throw new Error(error);
                })
            }
            dispatch(unsetOngoingBulkUpdate());
            return responses;
        }),
        [dispatch],
    );

    const bulkReopenIncidentsCallback = useCallback(
        (async (pks: Incident["pk"][]) => {
            dispatch(setOngoingBulkUpdate());
            let reopenEvents: Event[] = [];
            for (const pk of pks) {
                await api.postIncidentReopenEvent(pk)
                    .then((reopenEvent: Event) => {
                        reopenEvents.push(reopenEvent);
                    }).catch((error) => {
                        dispatch(unsetOngoingBulkUpdate());
                        throw new Error(error);
                    })
            }
            dispatch(unsetOngoingBulkUpdate());
            return reopenEvents;
        }),
        [dispatch],
    );

    const bulkCloseIncidentsCallback = useCallback(
        (async (pks: Incident["pk"][], description?: string) => {
            dispatch(setOngoingBulkUpdate());
            let closeEvents: Event[] = [];
            for (const pk of pks) {
                await api.postIncidentCloseEvent(pk, description)
                    .then((closeEvent: Event) => {
                        closeEvents.push(closeEvent);
                    }).catch((error) => {
                        dispatch(unsetOngoingBulkUpdate());
                        throw new Error(error);
                    })
            }
            dispatch(unsetOngoingBulkUpdate());
            return closeEvents;
        }),
        [dispatch],
    );

  return [
    state,
    {
      loadIncidentsFiltered,
      closeIncident: closeIncidentCallback,
      reopenIncident: reopenIncidentCallback,
      acknowledgeIncident: acknowledgeIncidentCallback,
      addTicketUrl: addTicketUrlCallback,
      bulkAcknowledgeIncidents: bulkAcknowledgeIncidentsCallback,
      bulkAddTicketUrl: bulkAddTicketUrlCallback,
      bulkReopenIncidents: bulkReopenIncidentsCallback,
      bulkCloseIncidents: bulkCloseIncidentsCallback,
    },
  ];
};
