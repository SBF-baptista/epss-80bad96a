
interface ProductionProgressBarProps {
  scannedCount: number;
  totalTrackers: number;
}

const ProductionProgressBar = ({ scannedCount, totalTrackers }: ProductionProgressBarProps) => {
  const progressPercentage = Math.round((scannedCount / totalTrackers) * 100);

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium">Progresso da Produção</span>
        <span className="font-bold text-blue-600">{progressPercentage}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div 
          className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProductionProgressBar;
