import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import Editor from "@monaco-editor/react";
import {
  AppShell,
  Group,
  Text,
  Badge,
  Button,
  CopyButton,
  Title,
  Stack,
  ActionIcon,
  Tooltip,
  Paper,
  Box,
  TextInput,
  Burger, // Added
  Divider, // Added
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks"; // Added
import { notifications } from "@mantine/notifications";
import {
  IconShieldLock,
  IconShare,
  IconCheck,
  IconCloudCheck,
  IconLoader2,
  IconUsers,
  IconPlus, // Added
} from "@tabler/icons-react";
import weblogo from "../public/redhorse.png";

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";
const socket = io(SOCKET_URL, { transports: ["websocket"] });

export default function App() {
  const [opened, { toggle, close }] = useDisclosure(); // Sidebar state
  const [text, setText] = useState("// Start collaborating...");
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);

  // 🔵 CREATE ROOM FEATURE
  const [newRoom, setNewRoom] = useState("");

  const roomId = window.location.pathname.slice(1) || "lobby";
  const isHome = window.location.pathname === "/";
  const editorRef = useRef(null);
  const isRemoteUpdate = useRef(false);

  // 🔵 RANDOM ROOM GENERATOR
  const handleRandomRoom = () => {
    const id = Math.random().toString(36).substring(2, 9);
    window.location.href = `/${id}`;
  };

  useEffect(() => {
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.emit("join-room", roomId);

    socket.on("room-metrics", (data) => setParticipantCount(data.users));

    socket.on("text-update", (value) => {
      if (!editorRef.current) return;
      isRemoteUpdate.current = true;
      const editor = editorRef.current;
      const model = editor.getModel();
      if (!model) return;

      if (model.getValue() !== value) {
        model.pushEditOperations(
          [],
          [{ range: model.getFullModelRange(), text: value }],
          () => null,
        );
      }
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("text-update");
      socket.off("room-metrics");
    };
  }, [roomId]);

  const handleEditorChange = (value) => {
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }
    setText(value);
    setSyncing(true);
    socket.emit("text-change", { roomId, text: value });
    setTimeout(() => setSyncing(false), 300);
  };

  return (
    <AppShell
      header={{ height: 70 }}
      navbar={{
        width: 300,
        breakpoint: "sm",
        collapsed: { desktop: true, mobile: !opened },
      }}
      padding="md"
      styles={(theme) => ({
        main: {
          backgroundColor: theme.colors.dark[8],
          minHeight: "100vh",
        },
      })}
    >
      <AppShell.Header
        bg="dark.7"
        style={{ borderBottom: "1px solid var(--mantine-color-dark-4)" }}
        px="xl"
      >
        <Group h="100%" justify="space-between">
          <Group gap="xs">
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
              color="white"
            />
            {/* 🔵 YOUR LOGO */}
            <Box
              w={50}
              h={50}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={weblogo} // 👈 file from public folder
                alt="DeepDrop Logo"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
            </Box>
            <Stack gap={0}>
              <Title order={4} c="white" lts={1}>
                DEEPDROP
              </Title>
              <Text size="xs" c="dimmed" fw={700}>
                v1.0 REAL-TIME
              </Text>
            </Stack>
          </Group>

          <Group gap="lg" visibleFrom="sm">
            <Group gap="xs">
              <IconUsers size={18} color="gray" />
              <Text size="sm" c="dimmed" fw={500}>
                {participantCount} Active
              </Text>
            </Group>

            <Badge
              color={connected ? "green.8" : "red.8"}
              variant="dot"
              size="lg"
            >
              {connected ? "Live" : "Connection Lost"}
            </Badge>

            <CopyButton value={window.location.href}>
              {({ copied, copy }) => (
                <Button
                  color={copied ? "teal" : "blue"}
                  variant="light"
                  leftSection={
                    copied ? <IconCheck size={18} /> : <IconShare size={18} />
                  }
                  onClick={() => {
                    copy();
                    notifications.show({
                      title: "Invite Link Copied",
                      message:
                        "Anyone with the link can now join your session.",
                      icon: <IconCheck size={16} />,
                      color: "teal",
                    });
                  }}
                >
                  {copied ? "Link Copied" : "Invite Users"}
                </Button>
              )}
            </CopyButton>
          </Group>
        </Group>
      </AppShell.Header>

      {/* 🔵 SIDEBAR CONTENT */}
      <AppShell.Navbar
        p="md"
        bg="dark.7"
        style={{ borderRight: "1px solid var(--mantine-color-dark-4)" }}
      >
        <Stack gap="md">
          <Title order={5} c="white">
            Navigation
          </Title>
          <Button
            color="teal"
            variant="light"
            leftSection={<IconPlus size={18} />}
            onClick={handleRandomRoom}
          >
            New Random Room
          </Button>

          <Divider
            my="sm"
            color="dark.4"
            label="Join Specific Room"
            labelPosition="center"
          />

          <TextInput
            placeholder="Enter Room Name"
            value={newRoom}
            onChange={(e) => setNewRoom(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" &&
              newRoom.trim() &&
              (window.location.href = `/${newRoom.trim()}`)
            }
          />
          <Button
            variant="light"
            disabled={!newRoom.trim()}
            onClick={() => (window.location.href = `/${newRoom.trim()}`)}
          >
            Join Room
          </Button>

          <Divider my="sm" color="dark.4" />

          <Text size="xs" c="dimmed" fw={700} tt="uppercase">
            Current Session
          </Text>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Status:
            </Text>
            <Badge color={connected ? "green.8" : "red.8"} variant="dot">
              {connected ? "Live" : "Offline"}
            </Badge>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Participants:
            </Text>
            <Text size="sm" c="white">
              {participantCount}
            </Text>
          </Group>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        {isHome ? (
          <Box
            h="calc(100vh - 120px)"
            display="flex"
            style={{ alignItems: "center", justifyContent: "center" }}
          >
            <Paper
              withBorder
              radius="lg"
              p="xl"
              style={{
                width: "100%",
                maxWidth: 420,
                background: "var(--mantine-color-dark-7)",
                border: "1px solid var(--mantine-color-dark-4)",
              }}
            >
              <Stack gap="md" align="center">
                <Title order={3}>Create a Room</Title>
                <Text size="sm" c="dimmed" ta="center">
                  Create a private room and start collaborating in real time.
                </Text>
                <TextInput
                  placeholder="Room name (e.g. abc123)"
                  value={newRoom}
                  onChange={(e) => setNewRoom(e.target.value)}
                  radius="md"
                  size="md"
                  w="100%"
                />
                <Button
                  size="md"
                  color="teal"
                  variant="light"
                  fullWidth
                  disabled={!newRoom.trim()}
                  onClick={() => {
                    if (newRoom.trim())
                      window.location.href = `/${newRoom.trim()}`;
                  }}
                >
                  Create Room
                </Button>
                <Button
                  variant="subtle"
                  color="gray"
                  onClick={handleRandomRoom}
                >
                  Or generate random ID
                </Button>
              </Stack>
            </Paper>
          </Box>
        ) : (
          <Stack h="calc(100vh - 120px)" gap="xs">
            <Paper
              shadow="xl"
              radius="md"
              withBorder
              flex={1}
              style={{
                overflow: "hidden",
                border: "1px solid var(--mantine-color-dark-4)",
              }}
            >
              <Editor
                onMount={(editor) => {
                  editorRef.current = editor;
                }}
                height="100%"
                theme="vs-dark"
                defaultLanguage="javascript"
                defaultValue={text}
                onChange={handleEditorChange}
                options={{
                  fontSize: 16,
                  fontFamily: "JetBrains Mono, monospace",
                  minimap: { enabled: true },
                  padding: { top: 20 },
                  smoothScrolling: true,
                  cursorBlinking: "expand",
                  lineHeight: 1.6,
                  quickSuggestions: false,
                  suggestOnTriggerCharacters: false,
                  acceptSuggestionOnEnter: "off",
                  tabCompletion: "off",
                  wordBasedSuggestions: "off",
                  autoClosingBrackets: "never",
                  autoClosingQuotes: "never",
                  formatOnPaste: false,
                  formatOnType: false,
                }}
              />
            </Paper>
          </Stack>
        )}
      </AppShell.Main>
    </AppShell>
  );
}
