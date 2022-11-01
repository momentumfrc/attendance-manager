# attendance-manager
Keep track of the attendence of our team members by allowing mentors to check students in and out.

# Developing

## Prerequisites
You will need an installation of docker. If using Windows, I recommend installing docker in [WSL](https://learn.microsoft.com/en-us/windows/wsl/install).

You will also need [Visual Studio Code](https://code.visualstudio.com/), with the [Remote Development Extension Pack](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.vscode-remote-extensionpack).

## Installation
1. Ensure the docker daemon is running. If using WSL, open a WSL terminal and run `sudo dockerd`.
2. Clone the repo and cd into the clone.
3. Run the start-network script.
```
./start-network.sh
```
4. Run the script at `attendance-api/setup.sh`
```
cd attendance-api && ./setup.sh
```

## Running
1. Start the development proxy
```
cd dev-proxy && docker-compose up
```
2. In a separate terminal, `cd` to the clone and open the attendance-api in Visual Studio Code (`code ./attendance-api`).
When prompted, select the option to **Reopen in container**.
3. Similarly, open the attendance-web in Visual Studio Code (`code ./attendance-web`) and select the option to **Reopen in container**.
4. Open a web browser and navigate to `http://localhost/`. You should see a development version of the attendance application.
