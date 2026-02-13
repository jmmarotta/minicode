Agents
Model / Provider
Tools

- engine.ts
- registry.ts
- bash.ts
  - execute bash commands
- list.ts
  - list files in a directory
- read.ts
  - read file
- edit.ts
  - edit file
- multiedit.ts
- write.ts
- glob.ts
- grep.ts
- webfetch.ts
- websearch.ts
- task.ts
- todo.ts
- prompt/
  - bash.txt
  - list.txt
  - read.txt
  - edit.txt
  - multiedit.txt
  - write.txt
  - glob.txt
  - grep.txt
  - webfetch.txt
  - websearch.txt
  - task.txt
  - todowrite.txt
  - todoread.txt

Sessions

- abstracts away the master loop
- has an async dual buffer queue to handle pause/interjections
- Messages
  Auth
  Modes
  Permission
  Actions executed on agent within agent methods
- compact
- init memory
  Memory (markdown file)

Session abstraction
has many messages
stores the conversation history
method to append user method and generate next message
has an associated current Agent

Agent abstraction
associated with a model
associated auth method
has a mode with default permissions
associated tools based on mode

Mode abstraction
plan, build, general, trace
plan mode only has access to readonly tools and exit plan mode tool
build mode has access to all and auto accepts writes
general requires permission for each write action
loads associated permissions and tools

use a simple CLI first with bindings to core then create a TUI once the core agent is properly constructed. We will only want to make this cli available if we execute the module. otherwise it should just expose all of the submodukes like sessions or whatever we determine to be expose that would be standard for javascript modules.

Create program for getting system prompts from claude code and analyzing the output and comparing to claude code

Tool calls can have callbacks
add tool calls for showing the user files
idempotent operations are allowed multiple times

Memory Stored in markdown files loaded with method on agent

Look through the following notes and come up with a high level plan for architecting the following library:

Build a library using Bun (typescript). Be sure to use methods available on bun wherever possible. This library is called minicode. We should plan on using the AI sdk and anthropic models for now with the default being sonnet 4. I want this library to wrap the ai sdk and provide abstractions for sessions, permissions, modes, memory, and models. Please use ai sdk v5 and ensure that we use a minimal number of dependencies. I’d like for the structure of the repo to be modular and use domain driven design with modules. Session states and config should be saved in normal xdg config directories that would be under the home directory ~. and session state can be represented as a json file. We should also add a logger and log to an appropriate file location that is configurable. the model should be configurable as well in ~/.config/minicode. When writing what will be either the session or the Agent, we should use a master loop to and a double async queue to deal with active and pending messages — This will allow for pausing and interrupting messages in progress. We should ensure to stream the responses from the provider. I want to use Bun methods wherever possible in place of the native node methods.
