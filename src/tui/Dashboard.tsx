import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import fs from 'fs';
import path from 'path';
import { CommsBridge, BlockRequest } from '../utils/bridge';

interface Task {
  id: string;
  file: string;
  status: 'pending' | 'active' | 'completed' | 'blocked' | 'pushed';
}

interface Manifest {
  id: string;
  name: string;
  status: string;
  tasks: Task[];
}

const Dashboard = ({ sprintDir, bridge }: { sprintDir: string; bridge?: CommsBridge }) => {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [activeBlock, setActiveBlock] = useState<BlockRequest | null>(null);
  const [userInput, setUserInput] = useState('');

  useEffect(() => {
    const manifestPath = path.resolve(sprintDir, 'manifest.json');
    const updateManifest = () => {
      try {
        if (fs.existsSync(manifestPath)) {
          const content = fs.readFileSync(manifestPath, 'utf8');
          setManifest(JSON.parse(content));
        }
      } catch (err) {
        // Ignore parse errors during writes
      }
    };

    updateManifest();
    const interval = setInterval(updateManifest, 1000); // Poll for changes
    return () => clearInterval(interval);
  }, [sprintDir]);

  useEffect(() => {
    if (!bridge) return;

    const onBlock = (data: BlockRequest) => {
      setActiveBlock(data);
      setUserInput('');
    };

    const onResolve = () => {
      setActiveBlock(null);
      setUserInput('');
    };

    bridge.on('block', onBlock);
    bridge.on('resolve', onResolve);

    return () => {
      bridge.off('block', onBlock);
      bridge.off('resolve', onResolve);
    };
  }, [bridge]);

  useInput((input, key) => {
    if (!activeBlock) return;

    if (key.return) {
      if (bridge) {
        bridge.resolveBlocker(userInput);
      }
    } else if (key.backspace || key.delete) {
      setUserInput((prev) => prev.slice(0, -1));
    } else if (!key.ctrl && !key.meta && !key.escape) {
      setUserInput((prev) => prev + input);
    }
  });

  if (!manifest) {
    return <Text>Loading manifest from {sprintDir}...</Text>;
  }

  return (
    <Box flexDirection="row" width="100%" height={20} borderStyle="round">
      {/* Left Side: Sprint Plan */}
      <Box flexDirection="column" width="50%" borderStyle="single" paddingX={1}>
        <Text bold color="cyan">
          Sprint Plan: {manifest.name}
        </Text>
        <Box flexDirection="column" marginTop={1}>
          {manifest.tasks.map((task) => (
            <Box key={task.id}>
              <Text
                color={
                  task.status === 'completed'
                    ? 'green'
                    : task.status === 'active'
                    ? 'yellow'
                    : task.status === 'blocked'
                    ? 'red'
                    : 'gray'
                }
              >
                {task.status === 'completed' ? '✅' : task.status === 'active' ? '🔄' : task.status === 'blocked' ? '🛑' : '⏳'}{' '}
                {task.id}: {task.file}
              </Text>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Right Side: Logs & Blockers */}
      <Box flexDirection="column" width="50%" borderStyle="single" paddingX={1}>
        <Text bold color="magenta">
          Logs & Blockers
        </Text>
        <Box marginTop={1} flexDirection="column">
          {activeBlock ? (
            <Box flexDirection="column">
              <Text color="red" bold>
                🛑 BLOCKER: {activeBlock.reason}
              </Text>
              <Text italic color="yellow">
                Question: {activeBlock.question}
              </Text>
              <Box marginTop={1}>
                <Text>Guidance: </Text>
                <Text color="green" underline>
                  {userInput}
                </Text>
                <Text color="gray">█</Text>
              </Box>
              <Box marginTop={1}>
                <Text color="dim">
                  Press Enter to resolve and restart agent.
                </Text>
              </Box>
            </Box>
          ) : (
            <Box flexDirection="column">
              <Text color="gray">Monitoring agent activity...</Text>
              <Box marginTop={1}>
                <Text italic color="yellow">
                  No active blockers.
                </Text>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
