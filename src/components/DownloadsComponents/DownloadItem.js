import { Box, Margins, Tile, Grid, Icon, Button } from '@rocket.chat/fuselage';
import React, { useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { ipcRenderer, remote, clipboard } from 'electron';
import { Progress } from 'react-sweet-progress';

import 'react-sweet-progress/lib/style.css';
import { formatBytes } from '../../downloadUtils';


// Recieve props for individual download item
export default function DownloadItem(props) {
	// console.log(props);
	const servers = useSelector(({ servers }) => servers);
	// console.log(servers);
	let paused = false;
	const { url } = props;
	const { fileName } = props;
	const { totalBytes } = props;
	const { itemId } = props;
	const { mime } = props;
	const { updateDownloads } = props;
	const date = props.date || new Date(itemId).toDateString();
	const fileSize = props.fileSize || formatBytes(props.totalBytes, 2, true);
	const [percentage, setPercentage] = useState(props.percentage || 0);
	const [path, setPath] = useState(props.path || '');
	const [status, setStatus] = useState(props.status || 'All Downloads');

	const completed = useMemo(() => percentage === 100, [percentage]);
	let serverTitle;
	const Mbps = props.Mbps || 0;

	if (props.serverTitle) {
		serverTitle = props.serverTitle;
	} else {
		const index = servers.findIndex(({ webContentId }) => webContentId === props.serverId);
		serverTitle = servers[index].title;
	}


	const handleProgress = (event, data) => {
		console.log('Progress');
		// console.log(` Current Bytes: ${ bytes }`);
		const percentage = Math.floor((data.bytes / totalBytes) * 100);
		updateDownloads({ status: 'All Downloads', percentage, serverTitle, itemId, Mbps: data.Mbps });
		setPercentage(percentage);
		setPath(data.savePath);
		console.log(data.Mbps);
	};
	// TODO: Convert to only recieve dynamic progressed bytes data. NEED TO THROTTLE
	useEffect(() => {
		// Listen on unique event only
		ipcRenderer.on(`downloading-${ itemId }`, handleProgress);
		return () => {
			ipcRenderer.removeListener(`downloading-${ itemId }`, handleProgress);
		};
	});


	// Download Completed, Send data back
	useEffect(() => {
		const downloadComplete = (data) => {
			console.log('Download Complete');
			setStatus('All Downloads');
			props.updateDownloads({ status: 'All Downloads', serverTitle, itemId, percentage: 100 });
			ipcRenderer.send('download-complete', { status: 'All Downloads', url, fileName, fileSize, percentage: 100, serverTitle, itemId, date, path: data.path, mime });
		};

		ipcRenderer.on(`download-complete-${ itemId }`, downloadComplete);
		return () => {
			ipcRenderer.removeListener(`download-complete-${ itemId }`, downloadComplete);
		};
	});


	const handleCancel = () => {
		setStatus('Cancelled');
		ipcRenderer.send(`cancel-${ itemId }`);
		props.updateDownloads({ status: 'Cancelled', percentage, itemId });
		ipcRenderer.send('download-complete', { status: 'Cancelled', url, fileName, fileSize, percentage, serverTitle, itemId, date, path, mime });
	};
	const handlePause = () => {
		console.log(percentage);
		setStatus('Paused');
		ipcRenderer.send(`pause-${ itemId }`);
		props.updateDownloads({ status: 'Paused', percentage, itemId });
		paused = !paused;
	};
	const handleRetry = () => {
		remote.getCurrentWebContents().downloadURL(`${ url }#${ serverTitle }`);
		props.clear(itemId);
	};

	// const printProps = () => {
	// 	console.log({ path, totalBytes, percentage, completed, status, serverTitle, mime });
	// };

	return props.layout === 'compact' ? (<Box width='100%' display='flex' justifyContent='center'>
		<Grid.Item sm={ 2 }>
			<Box display='flex' justifyContent='space-between' alignItems='center' height='50px'>
				{/* <img src={ image } height='30px' width='30px' style={ { borderRadius: '5px' } } alt="" /> */ }
				<Box fontScale='p2'>{ fileName }</Box>
				{/* Completed */ }
				<Box is={ Button } ghost display={ completed ? 'inline' : 'none' } onClick={ () => props.handleFileOpen(path) } style={ { textDecoration: 'none', color: '#2F80ED' } }><Icon name='chevron-up'></Icon></Box>
				{/* Progressing and Paused */ }
				<Box is={ Button } ghost display={ completed || status === 'Cancelled' ? 'none' : 'inline' } onClick={ () => handlePause() } style={ { textDecoration: 'none', color: '#2F80ED' } }>{ paused ? <Icon name='play'></Icon> : <Icon name='pause'></Icon> }</Box>
				<Box is={ Button } ghost display={ completed || status === 'Cancelled' ? 'none' : 'inline' } onClick={ () => handleCancel() } style={ { textDecoration: 'none', color: '#2F80ED' } }><Icon name='cross'></Icon></Box>
				{/* Cancelled */ }
				<Box is={ Button } ghost display={ status === 'Cancelled' ? 'inline' : 'none' } onClick={ handleRetry } style={ { textDecoration: 'none', color: '#2F80ED' } }><Icon name='refresh'></Icon></Box>
			</Box>
		</Grid.Item>

		<Grid.Item sm={ 1 }>
			<Box fontWeight='p2' height='50px' verticalAlign='middle'>
				<p>{ serverTitle }</p>
			</Box>
		</Grid.Item>
		<Grid.Item sm={ 1 }>
			<Box fontWeight='p2' height='50px' verticalAlign='middle'>
				<p>{ fileSize }</p>
			</Box>
		</Grid.Item>
		<Grid.Item sm={ 1 }>
			<Box fontWeight='p2' height='50px' verticalAlign='middle'>
				<p>{ Mbps ? `${ Mbps }Mbps/s` : null }</p>
			</Box>
		</Grid.Item>
		<Grid.Item sm={ 1 }>
			<Box display='flex' alignItems='center' height='50px' >
				<Progress theme={ { default: { color: '#2F80ED' } } } percent={ percentage } status='default' />
			</Box>
		</Grid.Item>
		<Grid.Item sm={ 1 }>
			<Box fontWeight='p2' height='50px' verticalAlign='middle'>
				<p>{ date }</p>
			</Box>
		</Grid.Item>
		<Grid.Item sm={ 1 }>
			<Box display='flex' alignItems='center' height='50px'>
				<Icon name='kebab'></Icon>
			</Box>
		</Grid.Item>
	</Box>) : (<Margins all='x32'>
		{/* <Grid md={true}> */ }
		<Tile elevation='2' style={ { width: '95%' } }>
			<Box height='11.5rem' width='100%' display='flex' alignItems='center'>
				<Grid.Item xl={ 2 } sm={ 2 } style={ { display: 'flex', alignItems: 'center', justifyContent: 'center' } }>
					<Box height='150px' width='150px' backgroundColor='lightgrey' borderRadius='10px' display='flex' flexDirection='column' alignItems='center' justifyContent='center'>
						<Icon size='7rem' name='clip' />
						<Box fonScale='s2' color='primary-500' display='block'>{ mime.split('/')[1] }</Box>
					</Box>
				</Grid.Item>
				<Grid.Item xl={ 9 } sm={ 5 } style={ { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'space-around', padding: '1.2rem 0' } }>
					<Box fontSize='h1' lineHeight='h1'>{ fileName }</Box>
					<Box display='flex' flexDirection='row' justifyContent='space-between' width='100%'>
						<Box fontSize='s2' color='info'>{ serverTitle }</Box> <Box fontSize='s2' color='info'> { date }</Box> <Box fontSize='s2' color='info'>{ fileSize || '25MB' }</Box>
						<Box fontSize='s2' color='info'>{ Mbps ? `${ Mbps }Mbps/s` : null }</Box>
						{/* ESTIMATED (TODO) */ }
						{/* <Box fontSize='s2' color='info'>{ '60s Left' }</Box> */ }
					</Box>
					<Progress theme={ { default: { color: '#2F80ED' } } } percent={ percentage } status='default' />
					{/* // TODO: Implement Show in Folder */ }
					<Box display='flex' flexDirection='row' justifyContent='space-between'>
						{/* Completed */ }
						<Box is={ Button } ghost display={ completed ? 'inline' : 'none' } onClick={ () => props.handleFileOpen(path) } style={ { textDecoration: 'none', color: '#2F80ED' } }>Show in Folder</Box>
						<Box is={ Button } ghost display={ completed ? 'inline' : 'none' } onClick={ () => clipboard.write({ text: url }) } style={ { textDecoration: 'none', color: '#2F80ED' } }>Copy Link</Box>
						{/* Progressing and Paused */ }
						<Box is={ Button } ghost display={ completed || status === 'Cancelled' ? 'none' : 'inline' } onClick={ () => handlePause() } style={ { textDecoration: 'none', color: '#2F80ED' } }>{ paused ? 'Resume' : 'Pause' }</Box>
						<Box is={ Button } ghost display={ completed || status === 'Cancelled' ? 'none' : 'inline' } onClick={ () => handleCancel() } style={ { textDecoration: 'none', color: '#2F80ED' } }>Cancel</Box>
						{/* Cancelled */ }
						<Box is={ Button } ghost display={ status === 'Cancelled' ? 'inline' : 'none' } onClick={ handleRetry } style={ { textDecoration: 'none', color: '#2F80ED' } }>Retry</Box>

					</Box>
				</Grid.Item>
				<Grid.Item xl={ 1 } sm={ 1 } style={ { display: 'flex', justifyContent: 'center' } }>
					<Button ghost onClick={ () => props.clear(itemId) } ><Icon name='cross' size='x32' /></Button>
				</Grid.Item>
			</Box>
		</Tile>
		{/* </Grid> */ }
	</Margins>);
}
