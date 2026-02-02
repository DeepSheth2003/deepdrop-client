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
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconShieldLock,
  IconShare,
  IconCheck,
  IconCloudCheck,
  IconLoader2,
  IconUsers,
} from "@tabler/icons-react";

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";
const socket = io(SOCKET_URL, { transports: ["websocket"] });

export default function App() {
  const [text, setText] = useState("// Start collaborating...");
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);

  const roomId = window.location.pathname.slice(1) || "lobby";
  const editorRef = useRef(null);
  const isRemoteUpdate = useRef(false);

  useEffect(() => {
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.emit("join-room", roomId);

    // Track active users (requires server-side support)
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
          [
            {
              range: model.getFullModelRange(),
              text: value,
            },
          ],
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
            <Box
            // p={8}
            // style={{
            //   borderRadius: 8,
            //   background: "linear-gradient(45deg, #228be6, #15aabf)",
            // }}
            >
              <IconShieldLock size={22} color="white" />
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

          <Group gap="lg">
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

      <AppShell.Main>
        <Stack h="calc(100vh - 120px)" gap="xs">
          {/* Metadata Bar */}
          <Paper bg="dark.6" p="xs" withBorder radius="md">
            <Group justify="space-between" px="sm">
              <Group>Room: {roomId ? roomId : "lobby"}</Group>

              <Group gap="xs">
                {syncing ? (
                  <Group gap={5}>
                    <IconLoader2
                      size={16}
                      className="animate-spin"
                      color="#228be6"
                    />
                    <Text size="xs" c="blue.4">
                      Pushing changes...
                    </Text>
                  </Group>
                ) : (
                  <Group gap={5}>
                    <IconCloudCheck size={16} color="#40c057" />
                    <Text size="xs" c="dimmed">
                      Synced to cloud
                    </Text>
                  </Group>
                )}
              </Group>
            </Group>
          </Paper>

          {/* Editor Container */}
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

                // 🔥 IMPORTANT FIXES
                quickSuggestions: false,
                suggestOnTriggerCharacters: false,
                acceptSuggestionOnEnter: "off",
                tabCompletion: "off",
                wordBasedSuggestions: "off",

                // UX improvements
                autoClosingBrackets: "never",
                autoClosingQuotes: "never",
                formatOnPaste: false,
                formatOnType: false,
              }}
            />
          </Paper>
        </Stack>
      </AppShell.Main>
    </AppShell>
  );
}
