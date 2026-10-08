import { Request, Response } from 'express';
import { YouTubeService } from '../services/youtube.service';

export const getYouTubeTranscript = async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }

    const transcriptData = await YouTubeService.getTranscript(url);
    
    return res.json({
      success: true,
      data: transcriptData
    });
  } catch (error: any) {
    console.error('YouTube transcript error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to retrieve YouTube transcript' 
    });
  }
};
