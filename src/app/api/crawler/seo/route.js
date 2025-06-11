import { fetchPage, extractSEOData } from '@/lib/crawler/crawler';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { url, options = {} } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Fetch the page
    const fetchResult = await fetchPage(url, options);

    if (!fetchResult.success) {
      return NextResponse.json({
        success: false,
        url,
        error: fetchResult.error,
        errorType: fetchResult.errorType
      });
    }

    // Extract SEO data
    try {
      const seoData = extractSEOData(fetchResult.html, url);
      
      // Calculate SEO score (basic implementation)
      const seoScore = calculateSEOScore(seoData);

      // n8n SEO analysis example (commented)
      /*
      // Example: Send SEO data to n8n for further processing
      if (options.webhookUrl) {
        await fetch(options.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url,
            seoData,
            seoScore,
            timestamp: new Date().toISOString(),
            // Could trigger n8n workflows for:
            // - SEO report generation
            // - Competitor comparison
            // - Historical tracking
            // - Alert on SEO issues
          })
        });
      }
      */

      return NextResponse.json({
        success: true,
        url: fetchResult.url,
        seoData,
        seoScore,
        recommendations: generateSEORecommendations(seoData, seoScore)
      });
    } catch (error) {
      return NextResponse.json({
        success: false,
        url,
        error: 'Failed to extract SEO data',
        message: error.message
      });
    }
  } catch (error) {
    console.error('SEO analysis error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error', 
        message: error.message 
      },
      { status: 500 }
    );
  }
}

function calculateSEOScore(seoData) {
  let score = 0;
  const factors = {
    hasTitle: 10,
    hasMetaDescription: 10,
    hasH1: 10,
    hasOpenGraph: 5,
    hasTwitterCard: 5,
    hasStructuredData: 10,
    hasAltText: 10,
    titleLength: 10,
    descriptionLength: 10,
    internalLinks: 10,
    externalLinks: 10
  };

  // Check basic factors
  if (seoData.title) score += factors.hasTitle;
  if (seoData.metaTags.description) score += factors.hasMetaDescription;
  if (seoData.headings.h1.length > 0) score += factors.hasH1;
  if (Object.keys(seoData.openGraph).length > 0) score += factors.hasOpenGraph;
  if (Object.keys(seoData.twitterCard).length > 0) score += factors.hasTwitterCard;
  if (seoData.structuredData.length > 0) score += factors.hasStructuredData;
  
  // Check title length (optimal: 50-60 characters)
  const titleLength = seoData.title.length;
  if (titleLength >= 50 && titleLength <= 60) {
    score += factors.titleLength;
  } else if (titleLength >= 30 && titleLength <= 70) {
    score += factors.titleLength / 2;
  }
  
  // Check meta description length (optimal: 150-160 characters)
  const descLength = (seoData.metaTags.description || '').length;
  if (descLength >= 150 && descLength <= 160) {
    score += factors.descriptionLength;
  } else if (descLength >= 120 && descLength <= 180) {
    score += factors.descriptionLength / 2;
  }
  
  // Check images with alt text
  if (seoData.images.total > 0) {
    const altTextRatio = seoData.images.withAlt / seoData.images.total;
    score += factors.hasAltText * altTextRatio;
  }
  
  // Check links
  if (seoData.links.internal > 0) score += factors.internalLinks;
  if (seoData.links.external > 0) score += factors.externalLinks;
  
  return Math.round(score);
}

function generateSEORecommendations(seoData, score) {
  const recommendations = [];
  
  if (!seoData.title) {
    recommendations.push({
      issue: 'Missing page title',
      impact: 'high',
      suggestion: 'Add a unique, descriptive title tag to your page'
    });
  } else if (seoData.title.length < 30 || seoData.title.length > 70) {
    recommendations.push({
      issue: 'Title length not optimal',
      impact: 'medium',
      suggestion: 'Keep title between 50-60 characters for best results'
    });
  }
  
  if (!seoData.metaTags.description) {
    recommendations.push({
      issue: 'Missing meta description',
      impact: 'high',
      suggestion: 'Add a compelling meta description to improve click-through rates'
    });
  } else if (seoData.metaTags.description.length < 120 || seoData.metaTags.description.length > 180) {
    recommendations.push({
      issue: 'Meta description length not optimal',
      impact: 'medium',
      suggestion: 'Keep meta description between 150-160 characters'
    });
  }
  
  if (seoData.headings.h1.length === 0) {
    recommendations.push({
      issue: 'Missing H1 heading',
      impact: 'high',
      suggestion: 'Add one H1 heading that describes the main topic of your page'
    });
  } else if (seoData.headings.h1.length > 1) {
    recommendations.push({
      issue: 'Multiple H1 headings',
      impact: 'medium',
      suggestion: 'Use only one H1 per page for better SEO structure'
    });
  }
  
  if (Object.keys(seoData.openGraph).length === 0) {
    recommendations.push({
      issue: 'Missing Open Graph tags',
      impact: 'medium',
      suggestion: 'Add Open Graph meta tags for better social media sharing'
    });
  }
  
  if (seoData.images.total > 0 && seoData.images.withAlt < seoData.images.total) {
    recommendations.push({
      issue: 'Images without alt text',
      impact: 'medium',
      suggestion: `Add alt text to ${seoData.images.total - seoData.images.withAlt} images for better accessibility and SEO`
    });
  }
  
  if (seoData.structuredData.length === 0) {
    recommendations.push({
      issue: 'No structured data found',
      impact: 'low',
      suggestion: 'Consider adding JSON-LD structured data for rich snippets'
    });
  }
  
  return recommendations;
}

export async function OPTIONS(request) {
  return new NextResponse(null, { status: 200 });
}