import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createAssessment, getAllAssessments } from '@/lib/db/store';
import { type Assessment, type DataSourceMode } from '@/types/assessment';

export async function GET() {
  const assessments = getAllAssessments();
  return NextResponse.json(assessments);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { companyName, dataSourceMode, useMockData } = body as {
    companyName: string;
    dataSourceMode: DataSourceMode;
    useMockData?: boolean;
  };

  if (!companyName?.trim()) {
    return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const assessment: Assessment = {
    id: uuidv4(),
    companyName: companyName.trim(),
    companyDescription: '',
    industry: '',
    companySize: null,
    dataSourceMode: dataSourceMode || 'public',
    useMockData: Boolean(useMockData || false),
    currentStage: 1,
    assessmentLens: 'SaaS/IT',
    scenarioNarratives: {},
    dimensionSelections: [],
    evidencePlan: [],
    createdAt: now,
    updatedAt: now,
  };

  createAssessment(assessment);
  return NextResponse.json(assessment, { status: 201 });
}
