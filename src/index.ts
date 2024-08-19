import { app, BrowserWindow } from 'electron';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import kill from 'tree-kill';

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
let DJANGO_CHILD_PROCESS: ChildProcessWithoutNullStreams = null;

if (require('electron-squirrel-startup')) {
	// eslint-disable-line global-require
	app.quit();
}

const createWindow = (): void =>
{
	startDjangoServer();

	// Create the browser window.
	const mainWindow = new BrowserWindow({
		height: 600,
		width: 800,
	});

	mainWindow.webContents.session.webRequest.onBeforeSendHeaders(
		(details, callback) =>
		{
			const { requestHeaders } = details;
			UpsertKeyValue(requestHeaders, 'Access-Control-Allow-Origin', ['*']);
			callback({ requestHeaders });
		},
	);

	mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) =>
	{
		const { responseHeaders } = details;
		UpsertKeyValue(responseHeaders, 'Access-Control-Allow-Origin', ['*']);
		UpsertKeyValue(responseHeaders, 'Access-Control-Allow-Headers', ['*']);
		callback({
			responseHeaders,
		});
	});

	// and load the index.html of the app.
	mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

	// Open the DevTools.
	openDevTools(mainWindow);
};

const UpsertKeyValue = (obj: any, keyToChange: string, value: string[]) =>
{
	const keyToChangeLower = keyToChange.toLowerCase();
	for (const key of Object.keys(obj)) {
		if (key.toLowerCase() === keyToChangeLower) {
			obj[key] = value;
			return;
		}
	}
	obj[keyToChange] = value;
}

const startDjangoServer = () =>
{
	DJANGO_CHILD_PROCESS = spawnDjango();
	DJANGO_CHILD_PROCESS.stdout.on('data', data =>
	{
		console.log(`stdout:\n${data}`);
	});
	DJANGO_CHILD_PROCESS.stderr.on('data', data =>
	{
		console.log(`stderr: ${data}`);
	});
	DJANGO_CHILD_PROCESS.on('error', (error) =>
	{
		console.log(`error: ${error.message}`);
	});
	DJANGO_CHILD_PROCESS.on('close', (code) =>
	{
		console.log(`child process exited with code ${code}`);
	});
	DJANGO_CHILD_PROCESS.on('message', (message) =>
	{
		console.log(`stdout:\n${message}`);
	});
	return DJANGO_CHILD_PROCESS;
}

const spawnDjango = () =>
{
	if (isDevelopmentEnv()) {
		return spawn(`python\\edtwExampleEnv\\Scripts\\python.exe`,
			['python\\manage.py', 'runserver', '--noreload'], {
			shell: true,
		});
	}
	return spawn(`cd python && edtwExample.exe runserver --settings=edtwExample.settings.prod --noreload`, {
		shell: true,
	});
}

const openDevTools = (mainWindow: BrowserWindow) =>
{

	if (isDevelopmentEnv()) {
		mainWindow.webContents.openDevTools();
	}
}

const isDevelopmentEnv = () =>
{
	console.log(`NODE_ENV=${process.env.NODE_ENV}`)
	return process.env.NODE_ENV == 'development'
}

app.on('ready', createWindow);

app.on('window-all-closed', () =>
{
	if (process.platform !== 'darwin') {
		app.quit();
	}
	kill( DJANGO_CHILD_PROCESS.pid );
});

app.on('before-quit', async function ()
{
	// Kill python process when the window is closed
	kill( DJANGO_CHILD_PROCESS.pid );
});

app.on('activate', () =>
{
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});