import React, { useState, useMemo } from "react";
// import "./incidenttable.css";
import "react-table/react-table.css";

import Button from "@material-ui/core/Button";
import EditIcon from "@material-ui/icons/Edit";
import Grid from "@material-ui/core/Grid";

import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";

import Chip from "@material-ui/core/Chip";

import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";

import TextField from "@material-ui/core/TextField";
import Typography from "@material-ui/core/Typography";

import DateFnsUtils from "@date-io/date-fns";
import { MuiPickersUtilsProvider, KeyboardDatePicker } from "@material-ui/pickers";

import { useStateWithDynamicDefault } from "../../utils";

import { makeConfirmationButton } from "../../components/buttons/ConfirmationButton";
import { UseAlertSnackbarResultType } from "../../components/alertsnackbar";
import CenterContainer from "../../components/centercontainer";

import api, { Event, EventType, Incident, Acknowledgement, AcknowledgementBody } from "../../api";

import SignedMessage from "./SignedMessage";
import SignOffAction from "./SignOffAction";
import { useStyles } from "./styles";

import { AckedItem, OpenItem, TicketItem } from "../incident/Chips";

type IncidentDetailsListItemPropsType = {
  title: string;
  detail: string | React.ReactNode;
};

const IncidentDetailsListItem: React.FC<IncidentDetailsListItemPropsType> = ({
  title,
  detail,
}: IncidentDetailsListItemPropsType) => {
  return (
    <ListItem>
      <ListItemText primary={title} secondary={detail} />
    </ListItem>
  );
};

type EventListItemPropsType = {
  event: Event;
};

const EventListItem: React.FC<EventListItemPropsType> = ({ event }: EventListItemPropsType) => {
  return (
    <ListItem>
      <ListItemText primary="Name" secondary={event.type.display} />
    </ListItem>
  );
};

type Tag = {
  key: string;
  value: string;
};

type TagChipPropsType = {
  tag: Tag;
  small?: boolean;
};

const isValidUrl = (url: string) => {
  // Pavlo's answer at
  // https://stackoverflow.com/questions/5717093/check-if-a-javascript-string-is-a-url
  try {
    new URL(url);
  } catch (_) {
    return false;
  }
  return true;
};

const TagChip: React.FC<TagChipPropsType> = ({ tag, small }: TagChipPropsType) => {
  if (isValidUrl(tag.value)) {
    return (
      <Chip
        size={(small && "small") || undefined}
        label={`${tag.key}=${tag.value}`}
        component="a"
        href={tag.value}
        clickable
      />
    );
  }
  return <Chip size={(small && "small") || undefined} label={`${tag.key}=${tag.value}`} />;
};

type TicketModifiableFieldPropsType = {
  url?: string;
  saveChange: (newUrl?: string) => void;
};

const TicketModifiableField: React.FC<TicketModifiableFieldPropsType> = ({
  url: urlProp,
  saveChange,
}: TicketModifiableFieldPropsType) => {
  const classes = useStyles();

  const [changeUrl, setChangeUrl] = useState<boolean>(false);
  const [url, setUrl] = useStateWithDynamicDefault<string | undefined>(urlProp);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(event.target.value);
    setChangeUrl(true);
  };

  const handleSave = () => {
    // If url is empty string ("") store it as undefined.
    if (url !== undefined && changeUrl) saveChange(url || undefined);
    setChangeUrl(false);
  };

  const error = useMemo(() => !isValidUrl(url || ""), [url]);

  return (
    <ListItem>
      <Grid container direction="row" justify="space-between">
        <TextField
          label="Ticket"
          defaultValue={url || ""}
          InputProps={{
            readOnly: !changeUrl,
          }}
          onChange={handleChange}
          error={error}
          helperText={error && "Invalid URL"}
        />
        {(!changeUrl && (
          <Button endIcon={<EditIcon />} onClick={() => setChangeUrl(true)}>
            Edit
          </Button>
        )) || (
          <Button className={classes.safeButton} onClick={() => handleSave()} disabled={error}>
            Set ticket URL
          </Button>
        )}
      </Grid>
    </ListItem>
  );
};

type AckListItemPropsType = {
  ack: Acknowledgement;
};

const AckListItem: React.FC<AckListItemPropsType> = ({ ack }: AckListItemPropsType) => {
  const classes = useStyles();

  const ackDate = new Date(ack.event.timestamp);
  const formattedAckDate = ackDate.toLocaleString();

  let hasExpired = false;
  let expiresMessage;
  if (ack.expiration) {
    const date = new Date(ack.expiration);
    if (Date.parse(ack.expiration) < Date.now()) {
      expiresMessage = `Expired ${date.toLocaleString()}`;
      hasExpired = true;
    } else {
      expiresMessage = `Expires ${date.toLocaleString()}`;
    }
  }

  return (
    <div className={classes.message}>
      <SignedMessage
        message={ack.event.description}
        timestamp={formattedAckDate}
        user={ack.event.actor}
        content={
          <ListItemText
            primary={expiresMessage || ""}
            secondary={
              <Typography paragraph style={{ textDecoration: hasExpired ? "line-through" : "none" }}>
                {ack.event.description}
              </Typography>
            }
          />
        }
      />
    </div>
  );
};

type CreateAckPropsType = {
  onSubmitAck: (ack: AcknowledgementBody) => void;
};

const CreateAck: React.FC<CreateAckPropsType> = ({ onSubmitAck }: CreateAckPropsType) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const handleSubmit = (msg: string) => {
    // TODO: switch to use API when implemented in backend
    onSubmitAck({
      event: {
        description: msg,
      },
      expiration: selectedDate && selectedDate.toUTCString(),
    });
  };

  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date);
  };

  return (
    <SignOffAction
      dialogTitle="Submit acknowledment"
      dialogContentText="Write a message describing why this incident was acknowledged "
      dialogSubmitText="Submit"
      dialogCancelText="Cancel"
      dialogButtonText="Create acknowledegment"
      title="Submit acknowledment"
      question="Are you sure you want to acknowledge this incident?"
      onSubmit={handleSubmit}
    >
      <MuiPickersUtilsProvider utils={DateFnsUtils}>
        <KeyboardDatePicker
          disableToolbar
          format="MM/dd/yyyy"
          margin="normal"
          id="expiry-date"
          label="Expiry date"
          value={selectedDate}
          onChange={handleDateChange}
          KeyboardButtonProps={{
            "aria-label": "change date",
          }}
        />
      </MuiPickersUtilsProvider>
    </SignOffAction>
  );
};

type ManualClosePropsType = {
  open: boolean;
  onManualClose: (msg: string) => void;
  onManualOpen: () => void;
};

const ManualClose: React.FC<ManualClosePropsType> = ({ open, onManualClose, onManualOpen }: ManualClosePropsType) => {
  const classes = useStyles();

  if (open) {
    return (
      <SignOffAction
        dialogTitle="Manually close incident"
        dialogContentText="Write a message describing why the incident was manually closed"
        dialogSubmitText="Close now"
        dialogCancelText="Cancel"
        dialogButtonText="Close incident"
        title="Manually close incident"
        question="Are you sure you want to close this incident?"
        onSubmit={onManualClose}
      />
    );
  } else {
    const ReopenButton = makeConfirmationButton({
      title: "Reopen incident",
      question: "Are you sure you want to reopen this incident?",
      onConfirm: onManualOpen,
    });

    return (
      <ReopenButton variant="contained" className={classes.dangerousButton}>
        Reopen incident
      </ReopenButton>
    );
  }
};

type IncidentDetailsPropsType = {
  incident: Incident;
  onIncidentChange: (incident: Incident) => void;
  displayAlertSnackbar: UseAlertSnackbarResultType["displayAlertSnackbar"];
};

const IncidentDetails: React.FC<IncidentDetailsPropsType> = ({
  incident,
  onIncidentChange,
  displayAlertSnackbar,
}: IncidentDetailsPropsType) => {
  const classes = useStyles();

  // const [ticketUrl, setTicketUrl] = useState<string | undefined>(incident && incident.ticket_url);
  // const [active, setActive] = useState<boolean>((incident && incident.active) || false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //onst { incidentSnackbar, displayAlertSnackbar }: UseAlertSnackbarResultType = useAlertSnackbar();
  // TODO: handle close message

  // TODO: users should be represented by username...
  const defaultEvent1 = {
    pk: 1,
    incident: 1,
    actor: 2,
    timestamp: "2020-01-14T03:04:14.387000+01:00",
    type: {
      value: EventType.ACKNOWLEDGE,
      display: "Acknowledge",
    },
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris vulputate id erat non pretium.",
  };
  const defaultEvent2 = {
    pk: 2,
    incident: 1,
    actor: 1,
    timestamp: "2020-01-15T03:04:14.387000+01:00",
    type: {
      value: EventType.ACKNOWLEDGE,
      display: "Acknowledge",
    },
    description: "Ack ack",
  };

  const defaultAcks = [
    {
      user: "testuser2",
      timestamp: "2020-01-14T03:04:14.387000+01:00",
      message: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris vulputate id erat non pretium.",
      expiresAt: "2020-02-14T03:04:14.387000+01:00",
      pk: 1,
      event: defaultEvent1,
      expiration: "2020-02-14T15:04:14.387000+01:00",
    },
    {
      user: "testuser",
      timestamp: "2020-01-15T03:04:14.387000+01:00",
      message: "Ack ack",
      expiresAt: null,
      pk: 2,
      event: defaultEvent2,
      expiration: null,
    },
  ];

  const [acks, setAcks] = useState<Acknowledgement[]>(defaultAcks);

  const chronoAcks = useMemo<Acknowledgement[]>(() => {
    return [...acks].sort((first: Acknowledgement, second: Acknowledgement) => {
      const firstTime = Date.parse(first.event.timestamp);
      const secondTime = Date.parse(second.event.timestamp);
      if (firstTime < secondTime) {
        return 1;
      } else if (firstTime > secondTime) {
        return -1;
      }
      if (first.expiration && second.expiration) {
        const firstExpires = Date.parse(first.expiration);
        const secondExpires = Date.parse(second.expiration);
        return firstExpires < secondExpires ? 1 : firstExpires > secondExpires ? -1 : 0;
      }
      return first.expiration ? 1 : -1;
    });
  }, [acks]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleManualClose = (msg: string) => {
    api
      .postIncidentCloseEvent(incident.pk)
      .then((event: Event) => {
        // TODO: add close event to list of events
        displayAlertSnackbar(`Closed incident ${incident && incident.pk}`, "success");
        onIncidentChange({ ...incident, open: false });
      })
      .catch((error) => {
        displayAlertSnackbar(`Failed to close incident ${incident && incident.pk} - ${error}`, "error");
      });
  };

  const handleManualOpen = () => {
    api
      .postIncidentReopenEvent(incident.pk)
      .then((event: Event) => {
        // TODO: add open event to list of events
        displayAlertSnackbar(`Reopened incident ${incident && incident.pk}`, "success");
        onIncidentChange({ ...incident, open: true });
      })
      .catch((error) => {
        displayAlertSnackbar(`Failed to reopen incident ${incident && incident.pk} - ${error}`, "error");
      });
  };

  const ackExpiryDate = undefined;

  // TODO: get tag from incident
  const tags = [
    { key: "test_url", value: "https://uninett.no" },
    { key: "test_host", value: "uninett.no" },
    { key: "host", value: "uninett.no" },
    { key: "timestamp", value: "123123123" },
    { key: "bytes", value: "askldfjalskdf" },
    { key: "origin_src", value: "something.tst" },
  ];

  // {incidentSnackbar}
  return (
    <div className={classes.root}>
      <Grid container spacing={3} className={classes.grid}>
        <Grid container item spacing={2} md alignItems="stretch" justify="space-evenly" direction="column">
          <Grid item>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Status
                </Typography>
                <CenterContainer>
                  <OpenItem open={incident.open} />
                  <AckedItem acked={true} expiration={ackExpiryDate} />
                  <TicketItem ticketUrl={incident.ticket_url} />
                </CenterContainer>
              </CardContent>
            </Card>
          </Grid>

          {!incident.open && (
            <Grid item>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Incident closed
                  </Typography>
                  <SignedMessage
                    message={"Incident was resolved on servicerestart"}
                    content={<Typography paragraph>Incident was resolved on servicerestart</Typography>}
                    timestamp={new Date().toUTCString()}
                    user={"you"}
                    TextComponent={Typography}
                  />
                </CardContent>
              </Card>
            </Grid>
          )}

          <Grid item>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Tags
                </Typography>
                {tags.map((tag: Tag) => (
                  <TagChip key={tag.key} tag={tag} />
                ))}
              </CardContent>
            </Card>
          </Grid>

          <Grid item>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Primary details
                </Typography>
                <List>
                  <IncidentDetailsListItem title="Description" detail={incident.description} />
                  <IncidentDetailsListItem title="Start time" detail={incident.start_time} />
                  <IncidentDetailsListItem title="Source" detail={incident.source.name} />
                  <IncidentDetailsListItem
                    title="Details URL"
                    detail={<a href={incident.details_url}>{incident.details_url}</a>}
                  />

                  <TicketModifiableField
                    url={incident.ticket_url}
                    saveChange={(url?: string) => {
                      // TODO: api
                      api
                        .patchIncidentTicketUrl(incident.pk, url || "")
                        .then((incident: Incident) => {
                          displayAlertSnackbar(`Updated ticket URL for ${incident.pk}`, "success");
                          onIncidentChange(incident);
                        })
                        .catch((error) => {
                          displayAlertSnackbar(`Failed to updated ticket URL ${error}`, "error");
                        });
                    }}
                  />
                  <ListItem>
                    <CenterContainer>
                      <ManualClose
                        open={incident.open}
                        onManualClose={handleManualClose}
                        onManualOpen={handleManualOpen}
                      />
                    </CenterContainer>
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container item spacing={2} md direction="column">
          <Grid item>
            <Typography color="textSecondary" gutterBottom>
              Acknowledgements
            </Typography>
            <List>
              {chronoAcks.map((ack: Acknowledgement) => (
                <AckListItem key={ack.event.timestamp} ack={ack} />
              ))}
            </List>
            <CenterContainer>
              <CreateAck
                key={acks.length}
                onSubmitAck={(ack: AcknowledgementBody) => {
                  // TODO: handle ack submit here
                  console.log(ack);
                  api
                    .postAck(incident.pk, ack)
                    .then((ack: Acknowledgement) => {
                      displayAlertSnackbar(`Submitted ack for ${incident && incident.pk}`, "success");
                      setAcks([...acks, ack]);
                    })
                    .catch((error) => {
                      displayAlertSnackbar(`Failed to post ack ${error}`, "error");
                    });
                }}
              />
            </CenterContainer>
          </Grid>
          <Grid item>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Related events
                </Typography>
                <List>
                  <EventListItem event={defaultEvent1} />
                  <EventListItem event={defaultEvent2} />
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>
    </div>
  );
};

export default IncidentDetails;
