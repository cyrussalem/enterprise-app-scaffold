#!/bin/bash

claude --permission-mode acceptEdits "inspect the ./docs/prd/iot-platform-prd.md. Look at @progress.txt \
1. Read the PRD and progress file. \
2. Find the next incomplete issue under ./issues and implement it. \
3. Follow automated and manual testing instructions in CLAUDE.md to ensure all tests pass. \
4. Commit your changes. \
5. Update progress.txt with what you did. \
ONLY DO ONE TASK AT A TIME."