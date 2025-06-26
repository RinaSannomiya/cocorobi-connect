import React from 'react';
import { CheckCircle } from 'lucide-react';

interface ProgressStep {
  id: string;
  name: string;
  path: string;
  completed: boolean;
  current: boolean;
}

interface ProgressBarProps {
  currentPath: string;
  userStatus?: string;
  isEightPremium?: boolean;
  hasMyTags?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  currentPath, 
  userStatus, 
  isEightPremium = false, 
  hasMyTags = false 
}) => {
  const getProgressSteps = (): ProgressStep[] => {
    const baseSteps = [
      { id: 'basic', name: '基本情報', path: '/basic-info' },
      { id: 'registration', name: '本登録', path: '/survey' },
      { id: 'ng-companies', name: 'NG設定', path: '/survey-complete' }
    ];

    if (isEightPremium) {
      baseSteps.push({ id: 'csv-upload', name: 'CSV', path: '/csv-upload' });
    }

    if (hasMyTags) {
      baseSteps.push({ id: 'mytag-settings', name: 'マイタグ', path: '/mytag-sales-settings' });
    }

    // 完了状態と現在状態を設定
    return baseSteps.map((step, index) => {
      const isCompleted = getStepCompletedStatus(step.id, userStatus, currentPath);
      const isCurrent = currentPath === step.path || 
                       (step.id === 'ng-companies' && currentPath === '/survey-complete') ||
                       (step.id === 'csv-upload' && currentPath === '/csv-upload') ||
                       (step.id === 'mytag-settings' && currentPath === '/mytag-sales-settings');
      
      return {
        ...step,
        completed: isCompleted,
        current: isCurrent
      };
    });
  };

  const getStepCompletedStatus = (stepId: string, userStatus?: string, currentPath?: string): boolean => {
    switch (stepId) {
      case 'basic':
        return userStatus !== 'email_registered';
      case 'registration':
        return userStatus === 'survey_completed' || userStatus === 'csv_uploaded' || userStatus === 'registration_complete';
      case 'ng-companies':
        return userStatus === 'csv_uploaded' || userStatus === 'registration_complete';
      case 'csv-upload':
        return userStatus === 'csv_uploaded' || userStatus === 'registration_complete';
      case 'mytag-settings':
        return userStatus === 'registration_complete';
      default:
        return false;
    }
  };

  const steps = getProgressSteps();

  // スマホ版での改行位置を決定（3項目で改行）
  const shouldBreakAfter = (index: number) => {
    return steps.length > 3 && index === 2; // 3項目目の後で改行
  };

  return (
    <div className="mt-6 text-center">
      <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-gray-500">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full ${
                step.completed 
                  ? 'bg-[#00736d]' 
                  : step.current 
                    ? 'bg-[#1D73C3]' 
                    : 'bg-gray-300'
              }`}>
                {step.completed && (
                  <CheckCircle className="w-3 h-3 text-white" />
                )}
              </div>
              <span className={`ml-1 ${
                step.current 
                  ? 'font-medium text-[#1D73C3]' 
                  : step.completed 
                    ? 'text-[#00736d]' 
                    : 'text-gray-500'
              }`}>
                {step.name}
              </span>
            </div>
            
            {/* 矢印の表示制御 */}
            {index < steps.length - 1 && !shouldBreakAfter(index) && (
              <div className="w-4 h-px bg-gray-300 hidden sm:block"></div>
            )}
            
            {/* スマホ版での改行 */}
            {shouldBreakAfter(index) && (
              <div className="w-full sm:hidden"></div>
            )}
            
            {/* 改行後の矢印（スマホ版） */}
            {shouldBreakAfter(index) && index < steps.length - 1 && (
              <div className="w-4 h-px bg-gray-300 sm:hidden"></div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default ProgressBar;