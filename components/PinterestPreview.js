import React, { useState, useRef, useEffect } from 'react';
import ReactPlayer from "react-player";
import _ from 'lodash';


const PinterestPostPreview = ({ pinTitle, pinLink, text, imgUrl, videoUrl, userProfileLink }) => {

    const [isFullscreen, setIsFullscreen] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [muted, setMuted] = useState(false);
    const [displayedTime, setDisplayedTime] = useState("00:00");
    const [duration, setDuration] = useState("00:00");
    const playerRef = useRef(null);
    const [playedSeconds, setPlayedSeconds] = useState(0)
    const [totalDuration, setTotalDuration] = useState(0)

    const togglePlayPause = () => {
        setPlaying(!playing);
    };
    
    const toggleMute = () => {
        setMuted(!muted);
    };

    const handleProgressBarClick = (e) => {
        const progressBar = e.currentTarget;
        const rect = progressBar.getBoundingClientRect();
        const clickPositionInPixels = e.clientX - rect.left;
        const clickPositionInPercentage = clickPositionInPixels / rect.width;
    
        const newTimeInSeconds = totalDuration * clickPositionInPercentage;
    
        if (playerRef.current && typeof newTimeInSeconds === "number" && isFinite(newTimeInSeconds)) {
            playerRef.current.seekTo(newTimeInSeconds);
        } else {
            console.error("Error seeking: Invalid time or player not available");
        }
    };
    
    const handleProgress = (progress) => {
        const playedSeconds = progress.playedSeconds;
        const minutes = Math.floor(playedSeconds / 60);
        const seconds = Math.floor(playedSeconds % 60);
        setDisplayedTime(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
        setPlayedSeconds(progress.playedSeconds);
    };
    
    const handleDuration = (d) => {
        const minutes = Math.floor(d / 60);
        const seconds = Math.floor(d % 60);
        setDuration(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
        setTotalDuration(d);  // Set the totalDuration state with the value received.
    };
    
    const handleFullscreen = () => {
        const videoContainer = document.querySelector('.videoContainer');
        if (videoContainer) {
            if (!document.fullscreenElement) {
                videoContainer.requestFullscreen();
                setIsFullscreen(true);
            } else {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };
    
    
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);
    

    const [hovered, setHovered] = useState(false);

    const toggleHover = () => setHovered(!hovered);

    function extractDomain(url) {
        const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/]+)/);
        return match ? match[1] : null;
    }

    function parseText(text) {
        const words = text.split(' ');
        const processedWords = words.flatMap((word, k) => {
            if (word.startsWith('#')) {
                return [<span className="hashtag" key={k}>{word}</span>, ' '];
            } else {
                return [word, ' '];
            }
        });
        
        // Remove the last space to avoid trailing space
        processedWords.pop();
        
        return processedWords;
    }    

    return (
        <div className="pinterestPostPreview">
            <div className='mainImg' onMouseEnter={toggleHover} onMouseLeave={toggleHover} >
                {
                    imgUrl ? <img className='main' src={imgUrl} /> : videoUrl ?
                    <div className='videoContainer' >
                        <ReactPlayer
                            onClick={() => setPlaying(prevState => !prevState)}
                            className='main'
                            url={videoUrl}
                            width='100%'
                            height='100%'
                            controls={false} 
                            ref={playerRef}
                            muted={muted}
                            playing={playing}
                            onProgress={handleProgress}
                            onDuration={handleDuration}
                        />
                        <div className='videoControllers'>
                            <div onClick={togglePlayPause}>
                                <img src={playing ? '/pinterest/pause.svg' : '/pinterest/play.svg' } alt="Play/Pause" />
                            </div>
                            <span className='time'>{displayedTime}</span>
                            <span className="video-progress">
                                <div className="progress-bar" onClick={handleProgressBarClick}>
                                    <div className="progress" style={{width: `${(playedSeconds / totalDuration) * 100}%`}}>
                                        <div className="knob"></div>
                                    </div>
                                </div>
                                
                            </span>
                            <span className='time'>{duration}</span>
                            <div onClick={toggleMute}>
                              <img src={muted ? '/pinterest/sound-off.svg' : '/pinterest/sound-on.svg' } alt="Mute/Unmute" />
                            </div>
                            <div onClick={handleFullscreen}>
                              <img src={isFullscreen ? '/pinterest/full-off.svg' : '/pinterest/full-on.svg'} alt="Fullscreen" />
                            </div>
                        </div>                         
                    </div> : ''
                }
                {
                    hovered && pinLink && !videoUrl ?
                        <div className='linkOnMedia' onClick={ () => {window.open(pinLink, '_blank')} }>
                            <img src='/pinterest/external.svg' />
                            <div>{extractDomain(pinLink)}</div>
                        </div>
                     : '' 
                }
                {
                    !videoUrl && imgUrl ? 
                    <div className='zoomOnMedia'>
                        <img src='/pinterest/zoom.svg' />
                    </div> : ''
                }
            </div>
            <div className='pinDetails'>
                <div className='saveDetails'>
                    <div>
                        <span><img src='/pinterest/dots.svg' /></span>
                        <span><img src='/pinterest/share.svg' /></span>
                        <span><img src='/pinterest/copy.svg' /></span>
                    </div>
                    <div>Save</div>
                </div>
                { pinLink ? <a href={pinLink} target="_blank">{extractDomain(pinLink)}</a> : '' }
                <p className='pinTitle' onClick={ () => {window.open(pinLink, '_blank')} }>{_.startCase(pinTitle)}</p>
                <p className='pinDesc'>{parseText(text)} | 📌 by <span className='hashtag' onClick={ () => {window.open(`${userProfileLink}`, '_blank')} }>#{userProfileLink.match(/\/([^/]+)\/$/)[1]}</span></p>
                <div className='pinnerInfo'>
                    <div>
                        <img src='/sm/pinterest.svg' />
                        <div>
                            <p>Pinterest</p>
                            <p>23M followers</p>
                        </div>
                    </div>
                    <div>
                        Follow
                    </div>
                </div>
                <div className='comments'>
                    Comments <br/>
                    <span>No comments yet! Add one to start the conversation.</span>
                </div>
            </div>
            <hr/>
            <div className='bottomSection'>
                <div>
                    <p>What do you think?</p>
                    <span><img src='/pinterest/love.svg' /></span>
                </div>
                <div>
                    <img src='/sm/pinterest.svg' />
                    <div>Add a comment</div>
                </div>
            </div>
        </div>
    );
};

export default PinterestPostPreview;
