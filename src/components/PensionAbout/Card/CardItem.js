import { useDispatch } from 'react-redux';
import { openModalAction, loadDataModalAction } from '../../../store/actions/uiAction';
import './CardItem.scss';

export const CardItem = ({ description, img, name, role, github }) => {
  const dispatch = useDispatch();

  const cupString = (str = '', lenght) => (str.length > lenght ? str.slice(0, lenght) + '...' : str);

  const handleModalContent = () => {
    dispatch(
      loadDataModalAction(
        <div className="Content">
          <div className="Content__head">
            <h2 className="Content__title">{name}</h2>
            <strong className="Content__role">{role}</strong>
            <hr className="divide" />
          </div>
          <div className="Content__body">
            <div className="Content__img" style={{ backgroundImage: `url(${img})` }}></div>

            <blockquote className="Content__description">
              " {description} "
              <a href={github} target="__blank" className="Content__link">
                {github.slice(8, -1)}
              </a>
            </blockquote>
          </div>
        </div>
      )
    );
  };

  const handleOpenModal = () => {
    handleModalContent();
    dispatch(openModalAction());
  };

  return (
    <section className="Card" style={{ backgroundImage: `url(${img})` }} onClick={handleOpenModal}>
      <div className="Card__layer">
        <div className="Card__info">
          <p className="Card__name">{cupString(name, 25)}</p>
          <em className="Card__role">{cupString(role, 25)}</em>
        </div>
      </div>
    </section>
  );
};
