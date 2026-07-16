type Props = {
  currentPage: number;
  totalPages: number;
  onFirst: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onLast: () => void;
};

export function PaginationControls({ currentPage, totalPages, onFirst, onPrevious, onNext, onLast }: Props) {
  return (
    <nav className="pagination" aria-label="Applications pagination">
      <button type="button" onClick={onFirst} disabled={currentPage === 1}>First</button>
      <button type="button" onClick={onPrevious} disabled={currentPage === 1}>Previous</button>
      <span>Page <strong>{currentPage}</strong> of {totalPages}</span>
      <button type="button" onClick={onNext} disabled={currentPage === totalPages}>Next</button>
      <button type="button" onClick={onLast} disabled={currentPage === totalPages}>Last</button>
    </nav>
  );
}
