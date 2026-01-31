import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import fs from 'fs';
import path from 'path';

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

const Dashboard = ({ sprintDir }: { sprintDir: string }) => {
  const [manifest, setManifest] = useState<Manifest | null>(null);

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

  if (!manifest) {
    return <Text>Loading manifest from {sprintDir}...</Text>;
  }

  return (
    <Box flexDirection="row" width="100%" height={20} borderStyle="round">
      {/* Left Side: Sprint Plan */}
      <Box flexDirection="column" width="50%" borderStyle="single" paddingX={1}>
        <Text bold color="cyan">Sprint Plan: {manifest.name}</Text>
        <Box flexDirection="column" marginTop={1}>
          {manifest.tasks.map((task) => (
            <Box key={task.id}>
              <Text color={task.status === 'completed' ? 'green' : task.status === 'active' ? 'yellow' : task.status === 'blocked' ? 'red' : 'gray'}>
                {task.status === 'completed' ? '✅' : task.status === 'active' ? '🔄' : task.status === 'blocked' ? '🛑' : '⏳'} {task.id}: {task.file}
              </Text>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Right Side: Logs & Blockers */}
      <Box flexDirection="column" width="50%" borderStyle="single" paddingX={1}>
        <Text bold color="magenta">Logs & Blockers</Text>
        <Box marginTop={1} flexDirection="column">
          <Text color="gray">Monitoring agent activity...</Text>
          <Box marginTop={1}>
             <Text italic color="yellow">No active blockers.</Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
