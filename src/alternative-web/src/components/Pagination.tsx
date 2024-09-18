import React from 'react';
import { usePropertyContext } from '../context/PropertyContext';

const Pagination: React.FC = () => {
  const { state, dispatch } = usePropertyContext();
  const itemsPerPage = 2500;
  const totalPages = Math.ceil(state.filteredListings.length / itemsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      dispatch({ type: 'SET_CURRENT_PAGE', payload: newPage });
    }
  };

  return (
    <div className="pagination">
      <button onClick={() => handlePageChange(state.currentPage - 1)} disabled={state.currentPage === 1}>
        Previous
      </button>
      <span>Page {state.currentPage} of {totalPages}</span>
      <button onClick={() => handlePageChange(state.currentPage + 1)} disabled={state.currentPage === totalPages}>
        Next
      </button>
    </div>
  );
};

export default Pagination;
