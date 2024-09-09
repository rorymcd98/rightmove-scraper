// @@filename: src/components/FilterPanel.tsx
import React, { useCallback, useMemo } from 'react';
import { usePropertyContext, PropertyState } from '../context/PropertyContext';
import { debounce } from 'lodash';

const FilterPanel: React.FC = () => {
    const { state, dispatch } = usePropertyContext();
    console.log('FilterPanel render');

    const handleFilterChange = useCallback((key: keyof PropertyState, value: any) => {
        dispatch({ type: 'SET_FILTER', payload: { key, value } as { key: keyof PropertyState; value: any } });
        dispatch({ type: 'APPLY_FILTERS_AND_SORT' });
    }, [dispatch]);

    const handleCategoryChange = useCallback((category: string, checked: boolean) => {
        dispatch({ type: 'SET_CATEGORY_FILTER', payload: { category, checked } });
        dispatch({ type: 'APPLY_FILTERS_AND_SORT' });
    }, [dispatch]);

    const debouncedSearchChange = useMemo(
        () => debounce((value: string) => {
            dispatch({ type: 'SET_SEARCH_TERM', payload: value });
            dispatch({ type: 'APPLY_FILTERS_AND_SORT' });
        }, 300),
        [dispatch]
    );

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        debouncedSearchChange(e.target.value);
    };

    return (
        <div className="filter-panel">
            <input
                type="text"
                placeholder="Search listings"
                onChange={handleSearchChange}
            />
            <input
                type="date"
                value={state.filterDate}
                onChange={(e) => handleFilterChange('filterDate', e.target.value)}
            />
            <input
                type="number"
                placeholder="Min Square Footage"
                value={state.minSquareFootage}
                onChange={(e) => handleFilterChange('minSquareFootage', e.target.value)}
            />
            <select
                value={state.sortCriteria || ''}
                onChange={(e) => handleFilterChange('sortCriteria', e.target.value)}
            >
                <option value="">Sort by...</option>
                <option value="date">Date</option>
                <option value="squareFootage">Square Footage</option>
                <option value="limitingRoomArea">Limiting Room Area</option>
            </select>
            <label>
                <input
                    type="checkbox"
                    checked={state.showFavourite}
                    onChange={(e) => handleFilterChange('showFavourite', e.target.checked)}
                />
                Show Favourites Only
            </label>
            <label>
                <input
                    type="checkbox"
                    checked={state.showHidden}
                    onChange={(e) => handleFilterChange('showHidden', e.target.checked)}
                />
                Show Hidden
            </label>
            <label>
                <input
                    type="checkbox"
                    checked={state.showMissingFtg}
                    onChange={(e) => handleFilterChange('showMissingFtg', e.target.checked)}
                />
                Show Missing Square Footage
            </label>
            <label>
                <input
                    type="checkbox"
                    checked={state.showMissingRoomDimensions}
                    onChange={(e) => handleFilterChange('showMissingRoomDimensions', e.target.checked)}
                />
                Show Missing Room Dimensions
            </label>
            {Object.entries(state.categoryFilters).map(([category, isChecked]) => (
                <label key={category}>
                    <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => handleCategoryChange(category, e.target.checked)}
                    />
                    {category}
                </label>
            ))}
        </div>
    );
};

export default React.memo(FilterPanel);
